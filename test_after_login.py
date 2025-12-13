#!/usr/bin/env python3
"""
Quick test for the /api/auth/me endpoint after login
Run this after you successfully login to diagnose the issue
"""
import subprocess
import json
import sys
from datetime import datetime

def run_command(cmd, description):
    """Run a shell command and return output"""
    print(f"\n{'='*60}")
    print(f"{description}")
    print(f"{'='*60}")
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=5)
        if result.stdout:
            print(result.stdout)
        if result.stderr and "Invoke-WebRequest" not in result.stderr:
            print("STDERR:", result.stderr)
        return result.returncode == 0
    except subprocess.TimeoutExpired:
        print("❌ Command timed out after 5 seconds")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("""
╔══════════════════════════════════════════════════════════╗
║  After-Login Error Diagnosis Tool                        ║
║  Tests the /api/auth/me endpoint                         ║
╚══════════════════════════════════════════════════════════╝
    """)
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"Timestamp: {timestamp}\n")
    
    results = {
        "backend_running": False,
        "me_endpoint": False,
        "token_stored": False,
        "cors_ok": False
    }
    
    # Test 1: Backend health
    print("\n[1/4] Checking if backend is running...")
    try:
        import requests
        resp = requests.get('http://localhost:8000/health', timeout=2)
        if resp.status_code == 200:
            print("✅ Backend is running and responding")
            results["backend_running"] = True
        else:
            print(f"❌ Backend returned status {resp.status_code}")
    except Exception as e:
        print(f"❌ Backend not accessible: {e}")
    
    # Test 2: Check localStorage token
    print("\n[2/4] Checking if token is stored...")
    print("""
To check if your token was saved after login, open DevTools:
  1. Press F12
  2. Go to Console
  3. Run: localStorage.getItem('access_token')
  
Expected: Long string starting with 'ey...' (JWT format)
❌ If null/empty: Token not saved after login
✅ If string: Token exists
    """)
    
    # Test 3: Check CORS
    print("\n[3/4] Checking CORS configuration...")
    cors_check = '''
try:
    import requests
    headers = {"Origin": "http://localhost:3000"}
    resp = requests.options('http://localhost:8000/api/auth/me', headers=headers, timeout=2)
    print(f"OPTIONS Status: {resp.status_code}")
    cors_header = resp.headers.get('access-control-allow-origin', 'NOT SET')
    print(f"CORS Allow-Origin: {cors_header}")
    if cors_header in ['*', 'http://localhost:3000']:
        print("✅ CORS configured correctly")
    else:
        print("❌ CORS not configured for localhost:3000")
except Exception as e:
    print(f"⚠️ CORS check failed: {e}")
'''
    exec(cors_check)
    
    # Test 4: Manual token test (requires token from browser)
    print("\n[4/4] Checking /api/auth/me endpoint...")
    print("""
To test the /api/auth/me endpoint:

Option A: From Browser Console
  1. Login successfully (you'll see "Login successful!" toast)
  2. Open DevTools (F12) → Console
  3. Copy & paste this:
     
     fetch('http://localhost:8000/api/auth/me', {
       headers: {'Authorization': 'Bearer ' + localStorage.getItem('access_token')}
     })
     .then(r => r.json())
     .then(d => console.log('Response:', d))
     .catch(e => console.error('Error:', e))
  
  4. If you see user data → Backend is working! Problem is in frontend
  5. If you see error → Problem is on backend or with token

Option B: From PowerShell (requires valid token)
  $token = 'YOUR_TOKEN_FROM_LOGIN'
  $headers = @{'Authorization' = "Bearer $token"}
  Invoke-WebRequest -Uri 'http://localhost:8000/api/auth/me' -Headers $headers -Method GET
    """)
    
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    if results["backend_running"]:
        print("✅ Backend is running")
    else:
        print("❌ Backend is not running or not responding")
        print("   Fix: cd backend && python run.py")
    
    print("""
If backend is running but you still get "No response" error:

1. Check browser console for the detailed error messages
   → Look for "[API Request]" or "[API Response]" logs

2. Check Network tab in DevTools
   → Look at request to /api/auth/me
   → Check status code and response

3. If request fails with no token
   → Token is not being saved after login
   → Check login success message appears

4. If request fails with "pending" status
   → Backend is slow or hanging
   → Check backend logs for SQL errors

5. If request succeeds (200) but no data
   → Frontend not processing response correctly
   → Check browser console for parsing errors
    """)

if __name__ == "__main__":
    main()
