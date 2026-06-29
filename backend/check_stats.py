import os
from pinecone import Pinecone
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "finkid-index")

pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index(PINECONE_INDEX_NAME)

stats = index.describe_index_stats()
print(f"Total vector count: {stats.total_vector_count}")
print(f"Stats breakdown: {stats}")
