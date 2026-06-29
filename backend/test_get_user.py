import os
from supabase import create_client

SUPABASE_URL = "https://mock.supabase.co"
SUPABASE_ANON_KEY = "mock-anon-key"
sb = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
try:
    user_res = sb.auth.get_user("invalid-token")
    print(f"user_res type: {type(user_res)}")
    print(f"user_res: {user_res}")
    if user_res:
        print(f"user_res.user: {user_res.user}")
except Exception as e:
    print(f"Exception: {type(e)} - {e}")
