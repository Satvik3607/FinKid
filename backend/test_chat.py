import os
import sys
import uuid
import requests
from dotenv import load_dotenv

# Add project root to path for local execution
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

API_BASE_URL = "http://127.0.0.1:8001"

def run_chat_test():
    print("=== FinKid Chat Endpoint Test ===\n")

    # 1. Register a test user
    test_id = str(uuid.uuid4())[:8]
    test_email = f"chat_test_{test_id}@gmail.com"
    test_password = "SuperSafePassword123!"
    test_username = f"ChatTest_{test_id}"
    
    # Register user using Admin API directly to avoid rate limits and auto-confirm
    from supabase import create_client
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("[FAIL] Missing admin credentials")
        return
        
    admin_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    try:
        user_res = admin_client.auth.admin.create_user({
            "email": test_email,
            "password": test_password,
            "email_confirm": True,
            "user_metadata": {
                "username": test_username,
                "age_range": "11-13",
                "parent_email": "parent@example.com"
            }
        })
        print(f"Created and auto-confirmed user via Admin API: {user_res.user.id}")
    except Exception as e:
        print(f"[FAIL] Admin create_user failed: {e}")
        return

    # Login to get token
    login_url = f"{API_BASE_URL}/api/auth/login"
    login_res = requests.post(login_url, json={
        "email": test_email,
        "password": test_password
    })
    
    if login_res.status_code != 200:
        print(f"[FAIL] Login returned {login_res.status_code}: {login_res.text}")
        return
        
    jwt_token = login_res.json().get("access_token")
    print("[SUCCESS] Got JWT Token.")

    # 2. Test /chat endpoint
    chat_url = f"{API_BASE_URL}/api/chat"
    headers = {"Authorization": f"Bearer {jwt_token}"}
    
    message = "what is compound interest"
    print(f"\n[2/3] Sending message to /chat: '{message}'")
    
    chat_payload = {
        "message": message
    }
    
    chat_res = requests.post(chat_url, json=chat_payload, headers=headers)
    
    if chat_res.status_code != 200:
        print(f"[FAIL] Chat endpoint returned {chat_res.status_code}: {chat_res.text}")
        return
        
    chat_data = chat_res.json()
    print("\n=== Chat Response ===")
    print(f"Conversation ID: {chat_data.get('conversation_id')}")
    print(f"Reply: {chat_data.get('reply')}")
    
    sources = chat_data.get("sources", [])
    print(f"\nSources Used ({len(sources)}):")
    for s in sources:
        print(f" - {s.get('source')} (Score: {s.get('score'):.4f})")
    
    # Edge Case 1: Empty message
    print("\n[Edge Case 1] Sending empty message to /chat")
    empty_payload = {"message": "   "}
    empty_res = requests.post(chat_url, json=empty_payload, headers=headers)
    print(f"Empty message returned {empty_res.status_code}: {empty_res.text}")
    if empty_res.status_code != 400:
        print("[WARNING] Expected 400 for empty message, got something else.")

    # Edge Case 3: Invalid JWT
    print("\n[Edge Case 3] Sending request with invalid JWT")
    invalid_headers = {"Authorization": "Bearer not_a_real_token123"}
    invalid_res = requests.post(chat_url, json={"message": "hello"}, headers=invalid_headers)
    print(f"Invalid JWT returned {invalid_res.status_code}: {invalid_res.text}")
    if invalid_res.status_code != 401:
        print("[FAIL] Expected 401 for invalid JWT, got something else.")

    # Edge Case 2: Out of context message
    unrelated_msg = "what's the weather today in Tokyo?"
    print(f"\n[Edge Case 2] Sending unrelated message to /chat: '{unrelated_msg}'")
    unrelated_payload = {"message": unrelated_msg}
    unrelated_res = requests.post(chat_url, json=unrelated_payload, headers=headers)
    if unrelated_res.status_code == 200:
        unrelated_data = unrelated_res.json()
        print(f"Reply: {unrelated_data.get('reply')}")
        sources = unrelated_data.get("sources", [])
        print(f"Sources Used ({len(sources)}):")
        for s in sources:
            print(f" - {s.get('source')} (Score: {s.get('score'):.4f})")
    else:
        print(f"[FAIL] Unrelated message returned {unrelated_res.status_code}: {unrelated_res.text}")
    
    print("\n[SUCCESS] Chat endpoint tests finished!")

    # 3. We skip cleanup in this test to allow manual inspection in DB, 
    # but normally you'd delete the user here.
    print("\n[3/3] Done. You can check the Supabase 'messages' table to confirm persistence.")

if __name__ == "__main__":
    run_chat_test()
