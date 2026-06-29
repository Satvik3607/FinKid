import os
import requests
import uuid
import pytest
from supabase import create_client

@pytest.mark.skip(reason="Requires valid Supabase credentials and a running backend")
def test_e2e_chat():
    url = os.environ.get('SUPABASE_URL', 'https://xvbgufpniafnufyqntpv.supabase.co')
    key = os.environ.get('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2Ymd1ZnBuaWFmbnVmeXFudHB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0NjEwMDUsImV4cCI6MjA5ODAzNzAwNX0.AsVkALt-I1k0Ls5iSy4Jbd3aqMnJqbU1ybk-HTygcUM')
    supabase = create_client(url, key)
    
    email = f"mockuser_{uuid.uuid4().hex[:8]}@gmail.com"
    password = "password123"
    
    # Create a mock user
    try:
        res = supabase.auth.sign_up({'email': email, 'password': password})
        print('Signup:', res.user.email if res.user else "already exists")
    except Exception as e:
        print('Signup failed:', e)
    
    # Login
    try:
        res2 = supabase.auth.sign_in_with_password({'email': email, 'password': password})
        if not res2.session:
            raise Exception(f"Authentication failed, no session returned. Response: {res2}")
        token = res2.session.access_token
        print('Logged in successfully, token length:', len(token))
    except Exception as e:
        print('Login failed:', e)
        pytest.fail(f"Login failed: {e}")
    
    # Make request to backend chat endpoint
    print('Sending chat request to backend...')
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    questions = [
        "who are you",
        "what is compound interest"
    ]
    
    for q in questions:
        print(f"\n--- Asking: '{q}' ---")
        data = {"message": q}
        try:
            resp = requests.post("http://localhost:8000/api/chat", json=data, headers=headers)
            print("Response status:", resp.status_code)
            print("Response reply:", resp.json().get('reply', resp.text))
        except Exception as e:
            print("Request failed:", e)
            pytest.fail(f"Request failed: {e}")
