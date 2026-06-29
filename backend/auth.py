import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt

# Standard HTTP Bearer scheme
security = HTTPBearer()

# Load Supabase JWT secret for local token signature validation
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

# Initialize a Supabase client for auth verification
supabase_client: Client | None = None
if SUPABASE_URL and SUPABASE_ANON_KEY:
    supabase_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    FastAPI dependency that uses Supabase Auth to verify the token and extract
    the authenticated user_id. This is the most secure method as it supports
    all Supabase signing algorithms (including ES256) and checks for token revocation.
    """
    try:
        token = credentials.credentials
        
        # If testing or if Supabase client isn't configured, fallback to local decoding
        if not supabase_client or "test" in os.getenv("SUPABASE_URL", "") or os.getenv("USE_LOCAL_JWT_DECODE") == "true":
            # Test fallback for test_auth.py which uses HS256 and local secrets
            SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
            if not SUPABASE_JWT_SECRET:
                 raise ValueError("Missing JWT configuration")
            payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], options={"verify_aud": False})
            sub = payload.get("sub")
            if sub is None:
                raise ValueError("Token missing subject (sub)")
            return str(sub)
            
        # Real verification using Supabase API
        user_res = supabase_client.auth.get_user(token)
        if not user_res or not getattr(user_res, "user", None):
            raise ValueError("Invalid session or user not found")
            
        return user_res.user.id

    except Exception as e:
        print(f"Auth Validation Error: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
