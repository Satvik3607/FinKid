import os
from jose import jwt

anon_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2Ymd1ZnBuaWFmbnVmeXFudHB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0NjEwMDUsImV4cCI6MjA5ODAzNzAwNX0.AsVkALt-I1k0Ls5iSy4Jbd3aqMnJqbU1ybk-HTygcUM"
secret = "SttFl2Xxk5Km4d4wEKQu1vSu54z7ASVzYgcUYtaIkygddiiHVJrmG9Vu92hqd70uiqKBh3q/CiMqUgmbQyjL0A=="

try:
    print('Trying string secret...')
    payload = jwt.decode(anon_key, secret, algorithms=['HS256'], options={'verify_aud': False})
    print('String secret works!', payload)
except Exception as e:
    print('String secret failed:', str(e))

try:
    print('Trying base64 decoded secret...')
    import base64
    secret_bytes = base64.b64decode(secret)
    payload = jwt.decode(anon_key, secret_bytes, algorithms=['HS256'], options={'verify_aud': False})
    print('Base64 decoded secret works!', payload)
except Exception as e:
    print('Base64 decoded secret failed:', str(e))
