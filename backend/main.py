import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environmental variables first
dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path)

from backend.auth_router import router as auth_router
from backend.chat_router import router as chat_router
from backend.gamification_router import router as gamification_router

app = FastAPI(
    title="FinKid API",
    description="Backend services for the FinKid RAG Financial Literacy Chatbot",
    version="1.0.0"
)

# Include routes
app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(gamification_router)

# CORS configuration to allow local web development (Next.js) and mobile dev (Expo)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://finkid.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class HealthStatus(BaseModel):
    status: str
    version: str
    environment: str

@app.get("/", response_model=HealthStatus)
def read_root():
    """Welcome endpoint for the FinKid API."""
    return HealthStatus(
        status="active",
        version="1.0.0",
        environment=os.getenv("ENVIRONMENT", "development")
    )

@app.get("/health", response_model=HealthStatus)
def health_check():
    """Liveness check endpoint."""
    return HealthStatus(
        status="healthy",
        version="1.0.0",
        environment=os.getenv("ENVIRONMENT", "development")
    )
