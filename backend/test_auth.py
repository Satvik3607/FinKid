import os
import sys

# Add project root to path for local execution
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set a test JWT Secret for in-memory signature verification
TEST_SECRET = "super-secret-test-key-for-finkid-jwt-signing"
os.environ["SUPABASE_JWT_SECRET"] = TEST_SECRET
os.environ["SUPABASE_URL"] = "https://test.supabase.co"
os.environ["SUPABASE_ANON_KEY"] = "mock-anon-key"

import unittest
from fastapi.testclient import TestClient  # pyrefly: ignore
from jose import jwt  # pyrefly: ignore
from backend.main import app  # pyrefly: ignore
from unittest.mock import patch, MagicMock


class TestSupabaseAuth(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health_check(self):
        """Verify that the health check endpoint responds correctly."""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "healthy")

    def test_verify_token_protected_route_fails_without_auth(self):
        """Verify that accessing the protected route without a token fails."""
        response = self.client.get("/api/auth/verify-token")
        self.assertIn(response.status_code, [401, 403])

    def test_verify_token_protected_route_fails_with_invalid_token(self):
        """Verify that an invalid token signature returns 401 Unauthorized."""
        headers = {"Authorization": "Bearer invalid.token.signature"}
        response = self.client.get("/api/auth/verify-token", headers=headers)
        self.assertEqual(response.status_code, 401)
        self.assertTrue("Could not validate credentials" in response.json()["detail"])

    from unittest.mock import patch, MagicMock
    @patch('supabase.create_client')
    def test_verify_token_protected_route_success(self, mock_create_client):
        """
        Verify that a correctly signed Supabase JWT passes through the local JWT 
        decoding middleware and successfully extracts the user_id.
        """
        # Set up mock for create_client
        mock_sb = MagicMock()
        mock_user = MagicMock()
        mock_user.id = "b2fa5638-76ad-45c1-8889-ff870198de74"
        mock_user_res = MagicMock()
        mock_user_res.user = mock_user
        mock_sb.auth.get_user.return_value = mock_user_res
        mock_create_client.return_value = mock_sb

        # Create a mock Supabase payload with 'sub' (user_id) and 'aud' claims
        payload = {
            "sub": "b2fa5638-76ad-45c1-8889-ff870198de74", # mock uuid
            "email": "child@finkid.local",
            "aud": "authenticated",
            "exp": 9999999999 # far-future expiration timestamp
        }
        
        # Sign the token locally using the test secret and HS256 algorithm (Supabase default)
        token = jwt.encode(payload, TEST_SECRET, algorithm="HS256")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = self.client.get("/api/auth/verify-token", headers=headers)
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "authenticated")
        self.assertEqual(response.json()["user_id"], payload["sub"])
        print(f"\n[SUCCESS] Decoded JWT successfully! Extracted user_id: {response.json()['user_id']}")

    @patch('supabase.create_client')
    def test_verify_token_protected_route_fails_with_expired_token(self, mock_create_client):
        """Verify that an expired token returns 401 Unauthorized."""
        payload = {
            "sub": "b2fa5638-76ad-45c1-8889-ff870198de74",
            "email": "child@finkid.local",
            "aud": "authenticated",
            "exp": 1  # Expired far in the past (1970)
        }
        token = jwt.encode(payload, TEST_SECRET, algorithm="HS256")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = self.client.get("/api/auth/verify-token", headers=headers)
        
        self.assertEqual(response.status_code, 401)
        self.assertTrue("Signature has expired" in response.json()["detail"] or "Could not validate credentials" in response.json()["detail"])

if __name__ == "__main__":
    unittest.main()
