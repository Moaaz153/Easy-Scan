#!/usr/bin/env python3
"""
Quick test script to verify login flow works correctly
"""
import requests
import json
import sys

BASE_URL = "http://localhost:8000"

def test_backend_health():
    """Test if backend is running"""
    try:
        response = requests.get(f"{BASE_URL}/docs", timeout=5)
        print("✅ Backend is running")
        return True
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend on", BASE_URL)
        print("   Start backend with: cd backend && python run.py")
        return False
    except Exception as e:
        print(f"❌ Error checking backend: {e}")
        return False

def test_login(email: str, password: str):
    """Test login endpoint"""
    try:
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": password},
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Login successful")
            print(f"   Access Token: {data.get('access_token')[:20]}...")
            print(f"   Refresh Token: {data.get('refresh_token')[:20]}...")
            return data.get('access_token')
        elif response.status_code == 401:
            print("❌ Login failed: Invalid credentials")
            print(f"   Response: {response.json()}")
            return None
        else:
            print(f"❌ Login failed with status {response.status_code}")
            print(f"   Response: {response.json()}")
            return None
    except Exception as e:
        print(f"❌ Login error: {e}")
        return None

def test_get_current_user(token: str):
    """Test /api/auth/me endpoint"""
    try:
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Get current user successful")
            print(f"   User ID: {data.get('id')}")
            print(f"   Email: {data.get('email')}")
            print(f"   Name: {data.get('full_name')}")
            return True
        elif response.status_code == 401:
            print("❌ Get current user failed: Invalid/expired token")
            print(f"   Response: {response.json()}")
            return False
        else:
            print(f"❌ Get current user failed with status {response.status_code}")
            print(f"   Response: {response.json()}")
            return False
    except Exception as e:
        print(f"❌ Get current user error: {e}")
        return False

def main():
    print("=" * 60)
    print("EasyScan Authentication Flow Test")
    print("=" * 60)
    
    # Test 1: Backend health
    print("\n[1/4] Testing backend health...")
    if not test_backend_health():
        sys.exit(1)
    
    # Get test credentials
    print("\n[2/4] Testing login...")
    email = input("Enter email to test login: ").strip()
    password = input("Enter password: ").strip()
    
    # Test 2: Login
    token = test_login(email, password)
    if not token:
        print("\n❌ Login test failed!")
        sys.exit(1)
    
    # Test 3: Get current user
    print("\n[3/4] Testing get current user...")
    if not test_get_current_user(token):
        print("\n❌ Get current user test failed!")
        sys.exit(1)
    
    print("\n" + "=" * 60)
    print("✅ All tests passed! Authentication flow is working.")
    print("=" * 60)

if __name__ == "__main__":
    main()
