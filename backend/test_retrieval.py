import os
import sys
from dotenv import load_dotenv
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer

# Load environmental configs
dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path)

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "finkid-index")

queries = ["what is a bank", "needs vs wants", "how do I make a budget"]

def run_test():
    import google.generativeai as genai
    genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
    
    model = SentenceTransformer("all-MiniLM-L6-v2")
    pc = Pinecone(api_key=PINECONE_API_KEY)
    index = pc.Index(PINECONE_INDEX_NAME)
    
    for q in queries:
        print(f"\n==============================")
        print(f"QUERY: {q}")
        
        # Expand
        expanded_query = q
        try:
            expansion_prompt = f"Rewrite this user query into a descriptive financial search query, keeping it under 15 words. Include synonyms if helpful. Only return the query itself. Query: '{q}'"
            exp_model = genai.GenerativeModel("gemini-2.5-flash")
            exp_resp = exp_model.generate_content(expansion_prompt)
            if exp_resp.text:
                expanded_query = exp_resp.text.strip()
            print(f"EXPANDED: {expanded_query}")
        except Exception as e:
            pass
            
        query_vector = model.encode([expanded_query])[0].tolist()
        results = index.query(vector=query_vector, top_k=15, include_metadata=True)
        
        query_words = set([w.lower() for w in expanded_query.split() if len(w) > 3])
        if not query_words:
            query_words = set(expanded_query.lower().split())
            
        reranked_matches = []
        for match in results.matches:
            text = (match.metadata or {}).get("text", "").lower()
            text_words = set(text.split())
            overlap = len(query_words.intersection(text_words)) / max(1, len(query_words))
            boosted_score = match.score * (1.0 + (overlap * 0.2))
            match.score = boosted_score
            reranked_matches.append(match)
            
        reranked_matches.sort(key=lambda m: m.score, reverse=True)
        
        for idx, match in enumerate(reranked_matches[:5]):
            score = match.score
            text = (match.metadata or {}).get("text", "")[:150].replace('\n', ' ')
            print(f"[{idx+1}] Score: {score:.4f} | {text}...")

if __name__ == "__main__":
    run_test()
