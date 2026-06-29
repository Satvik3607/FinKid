import os
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import Optional
from supabase import create_client, Client
from backend.auth import get_current_user_id

# Initialize APIRouter
router = APIRouter(prefix="/api/auth", tags=["authentication"])

# Fetch Supabase configurations from environment
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_ANON_KEY must be configured in environment variables.")

# Create the Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# =====================================================================
# Pydantic Schemas
# =====================================================================
class UserSignup(BaseModel):
    email: EmailStr
    password: str
    username: str
    age_range: str  # Options: '8-10', '11-13', '14-16'
    parent_email: Optional[EmailStr] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    user_id: str
    username: str

# =====================================================================
# Auth Routes
# =====================================================================

@router.post("/signup", status_code=status.HTTP_201_CREATED)
def register_user(payload: UserSignup):
    """
    Registers a new child user.
    Proxies registration to Supabase Auth and passes custom user metadata.
    """
    # Enforce age range constraints in Python backend as well
    if payload.age_range not in ['8-10', '11-13', '14-16']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Age range must be one of: '8-10', '11-13', '14-16'."
        )

    try:
        # Register user with Supabase Auth
        response = supabase.auth.sign_up({
            "email": payload.email,
            "password": payload.password,
            "options": {
                "data": {
                    "username": payload.username,
                    "age_range": payload.age_range,
                    "parent_email": payload.parent_email
                }
            }
        })
        
        # Verify if signup succeeded
        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Signup failed. Check credentials."
            )
            
        return {
            "message": "User registered successfully.",
            "user_id": response.user.id,
            "email": response.user.email
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/login", response_model=AuthResponse)
def login_user(payload: UserLogin):
    """
    Logs in an existing user and returns their session access JWT token.
    """
    try:
        response = supabase.auth.sign_in_with_password({
            "email": payload.email,
            "password": payload.password
        })
        
        if not response.session or not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password, or email not confirmed."
            )
            
        # Extract user profile information
        user = response.user
        metadata = user.user_metadata or {}
        username = metadata.get("username", user.email)
        
        return AuthResponse(
            access_token=response.session.access_token,
            refresh_token=response.session.refresh_token,
            user_id=user.id,
            username=username
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Login failed: {str(e)}"
        )

@router.get("/verify-token")
def verify_token(user_id: str = Depends(get_current_user_id)):
    """
    Protected route to verify that JWT extraction and signature validation is working.
    """
    return {
        "status": "authenticated",
        "user_id": user_id
    }
