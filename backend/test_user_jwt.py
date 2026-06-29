import os
from supabase import create_client

url = os.environ.get("SUPABASE_URL", "https://xvbgufpniafnufyqntpv.supabase.co")
key = os.environ.get("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2Ymd1ZnBuaWFmbnVmeXFudHB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0NjEwMDUsImV4cCI6MjA5ODAzNzAwNX0.AsVkALt-I1k0Ls5iSy4Jbd3aqMnJqbU1ybk-HTygcUM")

supabase = create_client(url, key)

def main():
    try:
        # Create a test user
        email = "test@example.com"
        password = "password123"
        try:
            res = supabase.auth.sign_up({"email": email, "password": password})
            print("Signed up user.")
        except Exception as e:
            print("Sign up failed (might exist):", e)
        
        # Log in
        res = supabase.auth.sign_in_with_password({"email": email, "password": password})
        if res.session is None:
            print("Login succeeded but no session was returned. You likely need to disable 'Confirm email' in Supabase Auth settings or verify the email address.")
            return
            
        token = res.session.access_token
        print("Logged in, token:", token[:20] + "...")
        
        # Now use python-jose to decode the token locally using the JWT secret
        from jose import jwt
        secret = "SttFl2Xxk5Km4d4wEKQu1vSu54z7ASVzYgcUYtaIkygddiiHVJrmG9Vu92hqd70uiqKBh3q/CiMqUgmbQyjL0A=="
        
        try:
            payload = jwt.decode(token, secret, algorithms=["HS256"], options={"verify_aud": False})
            print("Successfully decoded with string secret:", payload)
        except Exception as e:
            print("Failed to decode with string secret:", e)

    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    main()
