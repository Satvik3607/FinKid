import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
API_BASE_URL = "http://localhost:8001"

print("1. Logging into Supabase...")
# Use the test user created before or we can just try to create one first to guarantee it exists
import uuid
test_email = f"test_investigate_{uuid.uuid4().hex[:8]}@finkid.com"
test_password = "SuperSafePassword123!"

admin_supabase = None
if os.getenv("SUPABASE_SERVICE_ROLE_KEY"):
    from supabase import create_client
    admin_supabase = create_client(SUPABASE_URL, os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
    try:
        admin_supabase.auth.admin.create_user({
            "email": test_email,
            "password": test_password,
            "email_confirm": True
        })
    except Exception as e:
        pass # User might already exist

headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Content-Type": "application/json"
}
# Login
login_url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
login_res = requests.post(login_url, headers=headers, json={"email": test_email, "password": test_password})

if login_res.status_code != 200:
    print(f"Failed to login: {login_res.status_code} {login_res.text}")
    exit(1)

login_data = login_res.json()
print("Session created in Supabase?", "Yes" if "access_token" in login_data else "No")
if "access_token" not in login_data:
    print("Full login response:", json.dumps(login_data, indent=2))
    exit(1)

access_token = login_data["access_token"]
print("\n2. Sending chat message to /chat API...")
chat_res = requests.post(
    f"{API_BASE_URL}/api/chat",
    headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
    json={"message": "Hello!"}
)

print(f"\nExact Response Status Code: {chat_res.status_code}")
print(f"Exact Response Body:\n{chat_res.text}")
