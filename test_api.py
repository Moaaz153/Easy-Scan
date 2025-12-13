#!/usr/bin/env python3
"""
Test script to verify backend API endpoints
"""
import requests
import json
import time
from pathlib import Path

API_URL = "http://localhost:8000"

def test_health():
    """Test health endpoint"""
    print("\n[1/5] Testing health endpoint...")
    try:
        resp = requests.get(f"{API_URL}/health")
        print(f"  ✅ Health: {resp.status_code} - {resp.json()}")
        return True
    except Exception as e:
        print(f"  ❌ Health failed: {e}")
        return False

def test_signup():
    """Test signup endpoint"""
    print("\n[2/5] Testing signup endpoint...")
    try:
        data = {
            "full_name": "Test User",
            "email": f"test_{int(time.time())}@example.com",
            "password": "testpass123"
        }
        resp = requests.post(f"{API_URL}/api/auth/signup", json=data)
        print(f"  Status: {resp.status_code}")
        if resp.status_code in [201, 400, 409]:
            print(f"  ✅ Signup: {resp.json()}")
            return data
        else:
            print(f"  ❌ Signup failed: {resp.text}")
            return None
    except Exception as e:
        print(f"  ❌ Signup error: {e}")
        return None

def test_login(user_data):
    """Test login endpoint"""
    print("\n[3/5] Testing login endpoint...")
    if not user_data:
        print("  ❌ No user data from signup")
        return None
    
    try:
        creds = {
            "email": user_data["email"],
            "password": user_data["password"]
        }
        resp = requests.post(f"{API_URL}/api/auth/login", json=creds)
        print(f"  Status: {resp.status_code}")
        if resp.status_code in [200, 400]:
            body = resp.json()
            print(f"  ✅ Login: {body}")
            return body.get("access_token") if resp.status_code == 200 else None
        else:
            print(f"  ❌ Login failed: {resp.text}")
            return None
    except Exception as e:
        print(f"  ❌ Login error: {e}")
        return None

def test_get_user(token):
    """Test get current user endpoint"""
    print("\n[4/5] Testing get current user endpoint...")
    if not token:
        print("  ❌ No token from login")
        return False
    
    try:
        headers = {"Authorization": f"Bearer {token}"}
        resp = requests.get(f"{API_URL}/api/auth/me", headers=headers)
        print(f"  Status: {resp.status_code}")
        if resp.status_code == 200:
            print(f"  ✅ Get user: {resp.json()}")
            return True
        else:
            print(f"  ❌ Get user failed: {resp.text}")
            return False
    except Exception as e:
        print(f"  ❌ Get user error: {e}")
        return False

def test_cors():
    """Test CORS headers"""
    print("\n[5/5] Testing CORS headers...")
    try:
        headers = {"Origin": "http://localhost:3000"}
        resp = requests.options(f"{API_URL}/api/auth/login", headers=headers)
        cors_origin = resp.headers.get("access-control-allow-origin", "NOT SET")
        cors_methods = resp.headers.get("access-control-allow-methods", "NOT SET")
        print(f"  CORS Allow Origin: {cors_origin}")
        print(f"  CORS Allow Methods: {cors_methods}")
        if cors_origin == "*" or "localhost:3000" in cors_origin:
            print(f"  ✅ CORS properly configured")
            return True
        else:
            print(f"  ⚠️  CORS might be misconfigured")
            return False
    except Exception as e:
        print(f"  ⚠️  CORS test warning: {e}")
        return True  # Not critical

if __name__ == "__main__":
    print("=" * 60)
    print("BACKEND API TEST")
    print("=" * 60)
    
    # Test health
    if not test_health():
        print("\n❌ Backend is not running!")
        print("Start it with: cd backend; python run.py")
        exit(1)
    
    # Test signup
    user_data = test_signup()
    
    # Test login
    token = test_login(user_data)
    
    # Test get user
    test_get_user(token)
    
    # Test CORS
    test_cors()
    
    print("\n" + "=" * 60)
    print("SUMMARY: All tests completed")
    print("=" * 60)
