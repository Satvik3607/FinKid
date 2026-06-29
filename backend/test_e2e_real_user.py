import os
import requests
import pytest
from supabase import create_client

@pytest.mark.skip(reason="Requires valid Supabase credentials and a running backend")
def test_e2e_real_user():
    url = os.environ.get('SUPABASE_URL', 'https://xvbgufpniafnufyqntpv.supabase.co')
    anon_key = os.environ.get('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2Ymd1ZnBuaWFmbnVmeXFudHB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0NjEwMDUsImV4cCI6MjA5ODAzNzAwNX0.AsVkALt-I1k0Ls5iSy4Jbd3aqMnJqbU1ybk-HTygcUM')
    service_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2Ymd1ZnBuaWFmbnVmeXFudHB2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjQ2MTAwNSwiZXhwIjoyMDk4MDM3MDA1fQ.w85y6j6jmlzKRwrWQrLzWbesvwJkGkcWzdKp5Sbtido')
    
    # 1. Update password using admin API to guarantee login
    supabase_admin = create_client(url, service_key)
    target_uid = "0f1a17c8-4a1d-43d0-8842-5f22ee192c73"
    target_email = "chat_test_debug@gmail.com"
    new_password = "Password123!Test"
    
    try:
        supabase_admin.auth.admin.update_user_by_id(target_uid, {
            "password": new_password,
            "email_confirm": True
        })
        print(f"Successfully updated password for {target_email}")
    except Exception as e:
        print("Failed to update password:", e)
    
    # 2. Log in as the user
    supabase = create_client(url, anon_key)
    try:
        res = supabase.auth.sign_in_with_password({"email": target_email, "password": new_password})
        if res.session is None:
            print("Login succeeded but session is None. The user email might need confirmation.")
            pytest.fail("Session is None")
        token = res.session.access_token
        print("Logged in successfully! Token acquired.")
    except Exception as e:
        print("Failed to log in:", e)
        pytest.fail(f"Login failed: {e}")
    
    # 3. Send a real message
    print("Sending test messages...\n")
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    test_messages = [
        "show me how $100 grows over 10 years with compound interest",
        "what is a budget"
    ]
    conversation_id = None
    
    for msg in test_messages:
        print(f"--- Asking: '{msg}' ---")
        data = {
            "message": msg,
            "conversation_id": conversation_id
        }
        try:
            resp = requests.post("http://localhost:8000/api/chat", json=data, headers=headers)
            print("Response Status Code:", resp.status_code)
            json_resp = resp.json()
            
            # Capture conversation_id for subsequent calls
            if conversation_id is None:
                conversation_id = json_resp.get('conversation_id')
                
            reply = json_resp.get('reply', resp.text)
            print("Response reply:", reply.encode('utf-8', 'replace').decode('utf-8'))
            print("Follow-up questions:", json_resp.get('follow_up_questions', []))
            if 'chart' in json_resp:
                print("Chart Spec:", json_resp.get('chart'))
        except Exception as e:
            print("Failed to send chat request:", str(e).encode('utf-8', 'replace').decode('utf-8'))
            pytest.fail(f"Request failed: {e}")
