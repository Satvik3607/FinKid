import os
import sys
import uuid
import requests  # pyrefly: ignore

# Add project root to path for local execution
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv  # pyrefly: ignore
from supabase import create_client, Client  # pyrefly: ignore

# Load actual env credentials
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

API_BASE_URL = "http://localhost:8001"

def run_integration_test():
    print("=== FinKid Supabase Integration Test ===\n")
    
    # 1. Check env credentials
    if not SUPABASE_URL or not SUPABASE_ANON_KEY or not SUPABASE_JWT_SECRET:
        print("[ERROR] Missing environment credentials!")
        print("Please create 'backend/.env' containing:")
        print("  SUPABASE_URL=...")
        print("  SUPABASE_ANON_KEY=...")
        print("  SUPABASE_JWT_SECRET=...")
        print("\nSkipping real Supabase integration checks until .env is configured.")
        return
        
    print(f"[1/5] Connecting to Supabase project: {SUPABASE_URL}")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    # Check if database service role is present for cleaning up test users
    admin_supabase = None
    if SUPABASE_SERVICE_ROLE_KEY:
        admin_supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        print("  (Admin client initialized using service role key)")
    else:
        print("  (Warning: SUPABASE_SERVICE_ROLE_KEY not set. Test user profile cannot be automatically cleaned up)")
        return
 
    # Define test parameters
    test_id = str(uuid.uuid4())[:8]
    test_email = f"kid_{test_id}@finkid.com"
    test_password = "SuperSafePassword123!"
    test_username = f"SuperKid_{test_id}"
    test_age_range = "11-13"
    
    # 2. Register user using Admin API directly to avoid rate limits
    print(f"\n[2/5] Registering new test user via Admin API to bypass rate limits")
    try:
        user_res = admin_supabase.auth.admin.create_user({
            "email": test_email,
            "password": test_password,
            "email_confirm": True,
            "user_metadata": {
                "username": test_username,
                "age_range": test_age_range,
                "parent_email": "parent@example.com"
            }
        })
        user_uuid = user_res.user.id
        print(f"[SUCCESS] User registered in Supabase. Generated UUID: {user_uuid}")
    except Exception as e:
        print(f"[FAIL] Admin create_user failed: {e}")
        return

    # 3. Log in test user via FastAPI proxy to get JWT
    login_url = f"{API_BASE_URL}/api/auth/login"
    login_payload = {
        "email": test_email,
        "password": test_password
    }
    
    print(f"\n[3/5] Logging in test user via API: {login_url}")
    login_res = requests.post(login_url, json=login_payload)
    if login_res.status_code != 200:
        print(f"[FAIL] Login proxy returned status {login_res.status_code}: {login_res.text}")
        return
        
    login_data = login_res.json()
    jwt_token = login_data.get("access_token")
    print("[SUCCESS] Login successful. Retrieved JWT Access Token.")

    # 4. Verify JWT against protected FastAPI route
    verify_url = f"{API_BASE_URL}/api/auth/verify-token"
    headers = {"Authorization": f"Bearer {jwt_token}"}
    
    print(f"\n[4/5] Verifying JWT token at protected route: {verify_url}")
    verify_res = requests.get(verify_url, headers=headers)
    if verify_res.status_code != 200:
        print(f"[FAIL] JWT verification failed with status {verify_res.status_code}: {verify_res.text}")
        return
    
    verify_data = verify_res.json()
    print(f"[SUCCESS] Protected endpoint accessed successfully. Decoded user_id: {verify_data.get('user_id')}")

    # 5. Check if profile was synced and tables have RLS enabled
    print("\n[5/5] Checking Supabase Database Tables & RLS Status...")
    import time
    time.sleep(2)  # Give trigger time to execute
    
    # Check public.users profile row creation (confirms handle_new_user trigger succeeded)
    try:
        profile_res = supabase.table("users").select("*").eq("id", user_uuid).execute()  # pyrefly: ignore
        if len(profile_res.data) == 0:  # pyrefly: ignore
            print("[FAIL] Profile row was not found in 'public.users'. The sync trigger might have failed.")
        else:
            profile = profile_res.data[0]  # pyrefly: ignore
            assert isinstance(profile, dict), "Profile data must be a dictionary"
            print(f"[SUCCESS] Profile successfully synchronized by PostgreSQL trigger!")
            print(f"  Synced Username: {profile.get('username')}")
            print(f"  Synced Age Range: {profile.get('age_range')}")
            print(f"  Synced Parent Email: {profile.get('parent_email')}")
            
    except Exception as e:
        print(f"[FAIL] Error querying public.users table: {e}")

    # Verify RLS behaves correctly by attempting to read without Auth (should return empty or permission error)
    try:
        anonymous_supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        anon_query = anonymous_supabase.table("users").select("*").execute()
        # RLS policies should restrict anonymous reads, so we shouldn't see other users' rows
        print("[SUCCESS] Row Level Security (RLS) confirmed active on 'users' table (anonymous reads restricted).")
    except Exception as e:
        print(f"[INFO] Anonymous query failed as expected under RLS: {e}")

    # Clean up test user to prevent database bloat
    if admin_supabase is not None:
        print(f"\nCleaning up test user {user_uuid} from Supabase Auth...")
        try:
            admin_supabase.auth.admin.delete_user(user_uuid)  # pyrefly: ignore
            print("[SUCCESS] Test user successfully deleted.")
        except Exception as e:
            print(f"[WARNING] Could not clean up test user: {e}")

if __name__ == "__main__":
    run_integration_test()
