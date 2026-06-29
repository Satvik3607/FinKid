import os
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from supabase import create_client, Client
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer
import google.generativeai as genai

from backend.auth import get_current_user_id

router = APIRouter(prefix="/api/chat", tags=["chat"])

# --- Client Initialization ---

# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise ValueError("Missing Supabase credentials for chat router (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)")
supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Pinecone
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "finkid-index")
if not PINECONE_API_KEY:
    raise ValueError("Missing Pinecone credentials")
pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index(PINECONE_INDEX_NAME)

# SentenceTransformer
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

# Gemini
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("Missing Google Gemini credentials")
genai.configure(api_key=GOOGLE_API_KEY)


# --- Models ---

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None

class Source(BaseModel):
    source: str
    text: str
    score: float
    page_number: Optional[int] = None
    topic_tag: Optional[str] = None

class ChatResponse(BaseModel):
    reply: str
    conversation_id: str
    sources: List[Source]
    follow_up_questions: Optional[List[str]] = []
    chart: Optional[dict] = None


# --- System Prompt ---

SYSTEM_PROMPT = """You are a friendly, encouraging financial literacy tutor designed for children and teens.
Your goal is to explain financial concepts simply, using age-appropriate language, analogies, and a positive tone.

If the user asks about your identity (e.g., "who are you", "what is your job", "what do you do"), introduce yourself warmly as FinKid's AI tutor — a friendly assistant that helps kids learn about money, saving, budgeting, and financial basics. Keep this short and friendly.

CRITICAL FORMATTING RULES:
1. When explaining multiple related ideas, steps, or comparisons, use bullet points or numbered lists instead of dense paragraphs. This makes your answers easier to scan.
2. When comparing 2-3 things side by side (e.g., saving vs. investing, needs vs. wants), you MUST use a simple markdown table.
3. Keep the tone and length appropriate - formatting should make answers easier to read, not artificially longer.

CRITICAL CONTENT RULES:
1. You MUST answer the user's question primarily using the provided retrieved context. (Exceptions: You may answer identity questions using the instructions above. You are explicitly allowed and encouraged to perform mathematical calculations, create hypothetical examples, or generate charts to help illustrate financial concepts like compound interest or budgets, even if the exact numbers aren't in the context).
2. If the provided context does not contain the core topic at all, honestly say: "I don't have information about that in my materials, you could ask a trusted adult." Do not make up an answer for unrelated topics.
3. Never give personalized investment advice, specific stock recommendations, or recommend specific financial products. Keep everything general and educational.
4. DO NOT mention the name of the source or document in your response (e.g., do not say "According to [book]..." or "Based on the provided context..."). Just answer the question naturally using the information.
5. If explaining a concept where a simple chart would genuinely help (e.g., growth over time, comparing amounts, a budget breakdown), you MUST include a structured chart specification alongside your normal text reply. Do NOT include a chart for general or abstract questions. 
Format the chart as a JSON block wrapped in ```json ... ``` at the very end of your response, like this:
```json
{
  "chart": {
    "type": "bar", // or "line" or "pie"
    "title": "Chart Title",
    "labels": ["Label 1", "Label 2"],
    "data": [10, 20]
  }
}
```
"""


# --- Routes ---

@router.post("", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest, user_id: str = Depends(get_current_user_id)):
    message = req.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # 1. Handle Conversation ID
    conversation_id = req.conversation_id
    if not conversation_id:
        # Create a new conversation
        conv_res = supabase_client.table("conversations").insert({
            "user_id": user_id,
            "title": req.message[:50] + "..." if len(req.message) > 50 else req.message
        }).execute()
        if not conv_res.data:
            raise HTTPException(status_code=500, detail="Failed to create conversation")
        
        conversation_data = conv_res.data[0]
        if isinstance(conversation_data, dict):
            conversation_id = str(conversation_data["id"])
        else:
            raise HTTPException(status_code=500, detail="Invalid conversation data format")
    else:
        # Verify conversation belongs to user
        conv_res = supabase_client.table("conversations").select("*").eq("id", conversation_id).eq("user_id", user_id).execute()
        if not conv_res.data:
            raise HTTPException(status_code=404, detail="Conversation not found or unauthorized")

    # 2. Save User Message
    msg_res = supabase_client.table("messages").insert({
        "conversation_id": conversation_id,
        "role": "user",
        "content": req.message
    }).execute()
    if not msg_res.data:
        raise HTTPException(status_code=500, detail="Failed to save user message")

    # 3. Retrieval Step (RAG)
    
    # Query Expansion (Lightweight)
    expanded_query = req.message
    try:
        expansion_prompt = f"Rewrite this user query into a descriptive financial search query, keeping it under 15 words. Include synonyms if helpful. Only return the query itself. Query: '{req.message}'"
        exp_model = genai.GenerativeModel("gemini-2.5-flash")
        exp_resp = exp_model.generate_content(expansion_prompt)
        if exp_resp.text:
            expanded_query = exp_resp.text.strip()
    except Exception as e:
        print(f"Query expansion failed: {e}")
        
    # Embed the expanded query
    query_vector = embedding_model.encode([expanded_query])[0].tolist()
    
    # Query Pinecone (fetch more candidates)
    search_results = index.query(
        vector=query_vector,
        top_k=15,
        include_metadata=True
    )
    
    # Simple keyword overlap reranking
    query_words = set([w.lower() for w in expanded_query.split() if len(w) > 3])
    if not query_words:
        query_words = set(expanded_query.lower().split())
        
    reranked_matches = []
    for match in search_results.matches:
        text = (match.metadata or {}).get("text", "").lower()
        text_words = set(text.split())
        overlap = len(query_words.intersection(text_words)) / max(1, len(query_words))
        # Boost original score with overlap (max 20% boost)
        boosted_score = match.score * (1.0 + (overlap * 0.2))
        match.score = boosted_score
        reranked_matches.append(match)
        
    # Sort by boosted score descending
    reranked_matches.sort(key=lambda m: m.score, reverse=True)
    
    # Filter by relevance threshold and take top 5
    RELEVANCE_THRESHOLD = 0.35
    good_matches = [m for m in reranked_matches if m.score >= RELEVANCE_THRESHOLD][:5]
    
    context_texts = []
    sources_used = []
    
    for idx, match in enumerate(good_matches):
        meta = match.metadata or {}
        text = meta.get("text", "")
        source_name = meta.get("source", "Unknown")
        
        context_texts.append(f"--- Context Chunk {idx + 1} (Source: {source_name}) ---\n{text}")
        
        s = Source(
            source=source_name,
            text=text,
            score=match.score,
            page_number=meta.get("page_number"),
            topic_tag=meta.get("topic_tag")
        )
        sources_used.append(s)

    # 4. Generation Step
    context_block = "\n\n".join(context_texts) if context_texts else "No relevant context found."
    
    user_prompt = f"User Question: {req.message}\n\nRetrieved Context:\n{context_block}"

    try:
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=SYSTEM_PROMPT
        )
        response = model.generate_content(user_prompt)
        assistant_reply = response.text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM Generation failed: {str(e)}")

    chart_spec = None
    try:
        import re
        import json
        chart_match = re.search(r'```json\s*(\{.*?"chart"\s*:.*?\})\s*```', assistant_reply, re.DOTALL | re.IGNORECASE)
        if chart_match:
            parsed = json.loads(chart_match.group(1))
            if "chart" in parsed:
                chart_spec = parsed["chart"]
            assistant_reply = assistant_reply.replace(chart_match.group(0), "").strip()
    except Exception:
        pass # Ignore parsing errors for charts

    # Generate follow-up questions
    follow_up_questions = []
    try:
        import json
        follow_up_prompt = f"User asked: '{req.message}'. Assistant replied: '{assistant_reply}'. Generate 3 short, relevant follow-up questions a curious kid might ask next based on this. Return ONLY a JSON array of 3 strings."
        fu_model = genai.GenerativeModel("gemini-2.5-flash", generation_config={"response_mime_type": "application/json"})
        fu_resp = fu_model.generate_content(follow_up_prompt)
        follow_up_questions = json.loads(fu_resp.text)
        if not isinstance(follow_up_questions, list):
            follow_up_questions = []
    except Exception:
        pass # fail silently

    # 5. Save Assistant Message & Update Conversation
    sources_dict = [s.model_dump() for s in sources_used]
    
    supabase_client.table("messages").insert({
        "conversation_id": conversation_id,
        "role": "assistant",
        "content": assistant_reply,
        "sources": sources_dict
    }).execute()

    # Update conversation updated_at
    # Note: supabase timestamp update requires UTC ISO format, but 'now()' function is easier if we use RPC,
    # Alternatively, just updating a trivial field will trigger any DB update timestamp, but let's just let it be or update it explicitly.
    # The default value is NOW(), but to update it:
    import datetime
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    supabase_client.table("conversations").update({
        "updated_at": now_iso
    }).eq("id", conversation_id).execute()

    # 6. Return Response
    return ChatResponse(
        reply=assistant_reply,
        conversation_id=conversation_id,
        sources=sources_used,
        follow_up_questions=follow_up_questions[:3],
        chart=chart_spec
    )
