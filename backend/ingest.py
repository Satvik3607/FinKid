import os
import sys
import hashlib
import pypdf
import pandas as pd
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec
from sentence_transformers import SentenceTransformer

# Add parent dir to path for imports if needed
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load environmental configs
dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path)

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "finkid-index")

def get_deterministic_id(chunk_text: str, source: str) -> str:
    """Generate a deterministic MD5 hex string based on chunk source and text content."""
    content_bytes = f"{source}_{chunk_text}".encode('utf-8')
    return hashlib.md5(content_bytes).hexdigest()

def process_pdf(pdf_path: str, source_name: str, additional_metadata: dict = None) -> list[dict]:
    """Parse a PDF page by page and chunk semantically by paragraph."""
    print(f"Parsing PDF: {pdf_path}")
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF file not found at {pdf_path}")
    
    reader = pypdf.PdfReader(pdf_path)
    chunks = []
    
    # Target chunk sizes
    min_words = 50
    max_words = 300
    
    for page_idx, page in enumerate(reader.pages):
        text = page.extract_text()
        if not text:
            continue
            
        # Clean up line breaks within paragraphs
        paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
        
        current_chunk = []
        current_length = 0
        
        for p in paragraphs:
            p_clean = p.replace('\n', ' ')
            words = p_clean.split()
            
            if len(words) > max_words:
                if current_chunk:
                    meta = {"source": source_name, "page_number": page_idx + 1}
                    if additional_metadata: meta.update(additional_metadata)
                    chunks.append({"text": " ".join(current_chunk), "metadata": meta})
                    current_chunk = []
                    current_length = 0
                    
                for i in range(0, len(words), max_words):
                    sub_words = words[i:i+max_words]
                    meta = {"source": source_name, "page_number": page_idx + 1}
                    if additional_metadata: meta.update(additional_metadata)
                    chunks.append({"text": " ".join(sub_words), "metadata": meta})
                continue
                
            if current_length + len(words) > max_words and current_chunk:
                meta = {"source": source_name, "page_number": page_idx + 1}
                if additional_metadata: meta.update(additional_metadata)
                chunks.append({"text": " ".join(current_chunk), "metadata": meta})
                current_chunk = [p_clean]
                current_length = len(words)
            else:
                current_chunk.append(p_clean)
                current_length += len(words)
                
        if current_chunk:
            meta = {"source": source_name, "page_number": page_idx + 1}
            if additional_metadata: meta.update(additional_metadata)
            chunks.append({"text": " ".join(current_chunk), "metadata": meta})
                    
    print(f"Created {len(chunks)} chunks from PDF.")
    return chunks

def process_csv(csv_path: str) -> list[dict]:
    """Read CSV dataset and aggregate rows into descriptive natural-language chunks."""
    print(f"Parsing CSV: {csv_path}")
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"CSV file not found at {csv_path}")
        
    df = pd.read_csv(csv_path)
    chunks = []
    
    # 1. Income Type Insights
    income_grp = df.groupby('income_type')[['savings_rate', 'debt_to_income_ratio', 'monthly_income']].mean()
    for inc_type, row in income_grp.iterrows():
        text = (
            f"Financial analysis shows that users with an income type of '{inc_type}' "
            f"have an average monthly income of ${row['monthly_income']:.2f}. "
            f"Their average monthly savings rate is {row['savings_rate']*100:.1f}%, "
            f"and they maintain an average debt-to-income (DTI) ratio of {row['debt_to_income_ratio']:.2f}."
        )
        chunks.append({
            "text": text,
            "metadata": {
                "source": "kaggle_finance_dataset",
                "topic_tag": "income_types"
            }
        })
        
    # 2. Financial Scenario Insights
    scenario_grp = df.groupby('financial_scenario')[['savings_rate', 'debt_to_income_ratio', 'monthly_income']].mean()
    for scenario, row in scenario_grp.iterrows():
        # Calculate stress distribution per scenario
        stress_dist = df[df['financial_scenario'] == scenario]['financial_stress_level'].value_counts(normalize=True) * 100
        low_p = stress_dist.get('Low', 0.0)
        med_p = stress_dist.get('Medium', 0.0)
        high_p = stress_dist.get('High', 0.0)
        
        text = (
            f"Under the '{scenario}' financial scenario, users have an average monthly income of ${row['monthly_income']:.2f} "
            f"and an average savings rate of {row['savings_rate']*100:.1f}%. "
            f"In terms of mental well-being, the financial stress distribution under this scenario is: "
            f"{low_p:.1f}% low stress, {med_p:.1f}% medium stress, and {high_p:.1f}% high stress."
        )
        chunks.append({
            "text": text,
            "metadata": {
                "source": "kaggle_finance_dataset",
                "topic_tag": "financial_scenarios"
            }
        })
        
    # 3. Financial Stress Level Insights
    stress_grp = df.groupby('financial_stress_level')[['savings_rate', 'debt_to_income_ratio', 'credit_score', 'discretionary_spending', 'essential_spending']].mean()
    for stress_lvl, row in stress_grp.iterrows():
        cf_dist = df[df['financial_stress_level'] == stress_lvl]['cash_flow_status'].value_counts(normalize=True) * 100
        neg_cf = cf_dist.get('Negative', 0.0)
        pos_cf = cf_dist.get('Positive', 0.0)
        
        text = (
            f"Users experiencing '{stress_lvl}' financial stress exhibit specific spending and credit indicators. "
            f"They have an average credit score of {row['credit_score']:.0f} and a debt-to-income (DTI) ratio of {row['debt_to_income_ratio']:.2f}. "
            f"Their monthly discretionary spending averages ${row['discretionary_spending']:.2f}, while essential spending averages ${row['essential_spending']:.2f}. "
            f"About {neg_cf:.1f}% of these users face a negative cash flow status, and {pos_cf:.1f}% enjoy a positive cash flow status."
        )
        chunks.append({
            "text": text,
            "metadata": {
                "source": "kaggle_finance_dataset",
                "topic_tag": "financial_stress"
            }
        })
        
    # 4. Spending Category Profiles
    cat_grp = df.groupby('category')[['monthly_income', 'monthly_expense_total', 'discretionary_spending', 'essential_spending', 'savings_rate']].mean()
    for cat, row in cat_grp.iterrows():
        cat_df = df[df['category'] == cat]
        goal_met = cat_df['savings_goal_met'].mean() * 100
        stress_dist = cat_df['financial_stress_level'].value_counts(normalize=True) * 100
        high_stress = stress_dist.get('High', 0.0)
        
        text = (
            f"An analysis of users whose primary spending category is '{cat}' reveals unique budgeting behaviors. "
            f"These users earn an average monthly income of ${row['monthly_income']:.2f} and have total monthly expenses averaging ${row['monthly_expense_total']:.2f}. "
            f"Their discretionary spending is ${row['discretionary_spending']:.2f} and essential spending is ${row['essential_spending']:.2f}. "
            f"Only {goal_met:.1f}% of these users successfully met their savings goals. "
            f"Additionally, {high_stress:.1f}% of users in the '{cat}' category report high financial stress."
        )
        chunks.append({
            "text": text,
            "metadata": {
                "source": "kaggle_finance_dataset",
                "topic_tag": "spending_categories"
            }
        })
        
    # 5. Credit Score Tiers
    def get_tier(score):
        if score >= 750: return 'Excellent'
        elif score >= 600: return 'Fair/Good'
        else: return 'Poor'
    df['credit_tier'] = df['credit_score'].apply(get_tier)
    tier_grp = df.groupby('credit_tier')[['savings_rate', 'debt_to_income_ratio', 'monthly_income', 'financial_advice_score']].mean()
    for tier, row in tier_grp.iterrows():
        tier_df = df[df['credit_tier'] == tier]
        high_stress = (tier_df['financial_stress_level'] == 'High').mean() * 100
        
        text = (
            f"Users with '{tier}' credit scores have distinct financial health profiles. "
            f"They maintain an average savings rate of {row['savings_rate']*100:.1f}% and a debt-to-income (DTI) ratio of {row['debt_to_income_ratio']:.2f}. "
            f"Their financial advice score averages {row['financial_advice_score']:.1f} out of 100. "
            f"Among these users, {high_stress:.1f}% report experiencing high levels of financial stress."
        )
        chunks.append({
            "text": text,
            "metadata": {
                "source": "kaggle_finance_dataset",
                "topic_tag": "credit_scores"
            }
        })
        
    # 6. Cash Flow and Budget Goals
    cf_grp = df.groupby('cash_flow_status')[['savings_rate', 'budget_goal', 'actual_savings']].mean()
    for cf, row in cf_grp.iterrows():
        cf_df = df[df['cash_flow_status'] == cf]
        goals_met = cf_df['savings_goal_met'].mean() * 100
        
        text = (
            f"Cash flow status is a key determinant of financial success. "
            f"Users with a '{cf}' cash flow status have an average budget goal of ${row['budget_goal']:.2f} "
            f"and achieve an average actual monthly savings of ${row['actual_savings']:.2f}. "
            f"Importantly, {goals_met:.1f}% of these users successfully meet their savings goals, "
            f"illustrating the direct impact of cash flow management on wealth accumulation."
        )
        chunks.append({
            "text": text,
            "metadata": {
                "source": "kaggle_finance_dataset",
                "topic_tag": "cash_flow"
            }
        })
        
    print(f"Created {len(chunks)} aggregate insight chunks from CSV.")
    return chunks

def embed_and_upsert(chunks: list[dict]):
    """Embed all chunks and upsert to Pinecone with deterministic IDs."""
    if not chunks:
        print("No chunks to process.")
        return
        
    # Initialize Clients
    print("Initializing local SentenceTransformer and Pinecone client...")
    model = SentenceTransformer("all-MiniLM-L6-v2")
    pc = Pinecone(api_key=PINECONE_API_KEY)
    
    # Ensure Index Exists (384 dims for all-MiniLM-L6-v2)
    print(f"Checking if Pinecone index '{PINECONE_INDEX_NAME}' exists...")
    existing_indexes = [idx.name for idx in pc.list_indexes()]
    
    index_exists = PINECONE_INDEX_NAME in existing_indexes
    if index_exists:
        # Get the index details to check dimension
        idx_desc = pc.describe_index(PINECONE_INDEX_NAME)
        if idx_desc.dimension != 384:
            print(f"Index '{PINECONE_INDEX_NAME}' has dimension {idx_desc.dimension}. Deleting to recreate with dimension 384...")
            pc.delete_index(PINECONE_INDEX_NAME)
            # Wait for deletion to complete
            import time
            while PINECONE_INDEX_NAME in [idx.name for idx in pc.list_indexes()]:
                print("Waiting for index deletion to complete...")
                time.sleep(2)
            index_exists = False
            
    if not index_exists:
        print(f"Creating Pinecone index '{PINECONE_INDEX_NAME}' (dimension=384)...")
        pc.create_index(
            name=PINECONE_INDEX_NAME,
            dimension=384,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1")
        )
        print("Index created successfully.")
        import time
        while not pc.describe_index(PINECONE_INDEX_NAME).status.ready:
            print("Waiting for index to be ready...")
            time.sleep(2)
    else:
        print(f"Pinecone index '{PINECONE_INDEX_NAME}' already exists with correct dimension.")
        
    index = pc.Index(PINECONE_INDEX_NAME)
    
    # Batch embedding and upserting
    batch_size = 100
    total_chunks = len(chunks)
    print(f"Embedding and upserting {total_chunks} chunks in batches of {batch_size}...")
    
    for i in range(0, total_chunks, batch_size):
        batch_chunks = chunks[i:i + batch_size]
        texts = [c["text"] for c in batch_chunks]
        
        # Get embeddings from local model
        embeddings = model.encode(texts).tolist()
        
        # Form vectors
        vectors = []
        for chunk, emb in zip(batch_chunks, embeddings):
            chunk_id = get_deterministic_id(chunk["text"], chunk["metadata"]["source"])
            metadata = {**chunk["metadata"], "text": chunk["text"]}
            vectors.append({
                "id": chunk_id,
                "values": emb,
                "metadata": metadata
            })
            
        # Upsert
        print(f"Upserting batch {i//batch_size + 1}/{(total_chunks + batch_size - 1)//batch_size}...")
        index.upsert(vectors=vectors)
        
    print("[SUCCESS] All chunks successfully embedded and upserted to Pinecone.")

def run_test_query(query: str = "what is compound interest"):
    """Search Pinecone with a query vector and print top results."""
    print(f"\n--- Running Sanity Check Query: '{query}' ---")
    model = SentenceTransformer("all-MiniLM-L6-v2")
    pc = Pinecone(api_key=PINECONE_API_KEY)
    index = pc.Index(PINECONE_INDEX_NAME)
    
    # 1. Embed query
    query_vector = model.encode([query])[0].tolist()
    
    # 2. Query Pinecone
    results = index.query(
        vector=query_vector,
        top_k=3,
        include_metadata=True
    )
    
    # 3. Print Results
    for idx, match in enumerate(results.matches):
        score = match.score
        metadata = match.metadata or {}
        text = metadata.get("text", "N/A")
        source = metadata.get("source", "N/A")
        print(f"\nMatch #{idx + 1} (Score: {score:.4f}, Source: {source})")
        if source == "simple_path_to_wealth":
            print(f"  Page Number: {metadata.get('page_number')}")
        elif source == "kaggle_finance_dataset":
            print(f"  Topic Tag: {metadata.get('topic_tag')}")
        print(f"  Snippet: {text[:200]}...")

def main():
    if not PINECONE_API_KEY:
        print("[ERROR] Missing API Credentials! Please check backend/.env contains:")
        print("  PINECONE_API_KEY=...")
        sys.exit(1)
        
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    pdf_path = os.path.join(backend_dir, "book.pdf")
    csv_path = os.path.join(backend_dir, "personal_finance_tracker_dataset.csv")
    
    # 1. Process sources
    try:
        pdf_chunks = process_pdf(pdf_path, "simple_path_to_wealth")
    except Exception as e:
        print(f"[ERROR] Failed to process book.pdf: {e}")
        pdf_chunks = []
        
    try:
        csv_chunks = process_csv(csv_path)
    except Exception as e:
        print(f"[ERROR] Failed to process CSV: {e}")
        csv_chunks = []
        
    # Process FDIC datasets
    dataset_dir = os.path.join(backend_dir, "DataSet")
    fdic_chunks = []
    if os.path.exists(dataset_dir):
        for root, dirs, files in os.walk(dataset_dir):
            for file in files:
                if file.lower().endswith(".pdf"):
                    full_path = os.path.join(root, file)
                    folder_name = os.path.basename(root)
                    
                    if "Grades" in folder_name:
                        grade_level = folder_name.replace("Grades", "").strip()
                    else:
                        grade_level = "basics"
                        
                    try:
                        c = process_pdf(full_path, "fdic_money_smart", {"grade_level": grade_level, "filename": file})
                        fdic_chunks.extend(c)
                    except Exception as e:
                        print(f"[ERROR] Failed to process {file}: {e}")
    else:
        print(f"[INFO] No FDIC dataset found at {dataset_dir}")
        
    all_chunks = pdf_chunks + csv_chunks + fdic_chunks
    if not all_chunks:
        print("[ERROR] No chunks created. Ingestion aborted.")
        sys.exit(1)
        
    # 2. Embed and Upsert
    try:
        embed_and_upsert(all_chunks)
    except Exception as e:
        print(f"[ERROR] Ingestion failed: {e}")
        sys.exit(1)
        
    # 3. Run Test Query
    try:
        run_test_query("what is compound interest")
    except Exception as e:
        print(f"[ERROR] Query test failed: {e}")

if __name__ == "__main__":
    main()
