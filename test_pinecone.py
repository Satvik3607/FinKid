import os
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from pinecone import Pinecone

load_dotenv("backend/.env")

print("=== PINECONE INDEX STATS ===")
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index(os.getenv("PINECONE_INDEX_NAME") or "finkid-index")

stats = index.describe_index_stats()
print(f"Total Vector Count: {stats.total_vector_count}")
print(f"Dimension: {stats.dimension}")
print("\n=== PINECONE QUERY TEST ===")

print("Loading embedding model...")
model = SentenceTransformer("all-MiniLM-L6-v2")

query_text = "what is compound interest"
print(f"Querying for: '{query_text}'")
query_embedding = model.encode(query_text).tolist()

results = index.query(
    vector=query_embedding,
    top_k=3,
    include_metadata=True
)

for i, match in enumerate(results.matches, 1):
    metadata = match.metadata or {}
    print(f"\n[Result {i}] Score: {match.score:.4f} | Source: {metadata.get('source', 'unknown')}")
    print(f"Text Chunk:\n{metadata.get('text', 'No text found')}")
