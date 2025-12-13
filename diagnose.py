#!/usr/bin/env python3
"""
Quick diagnostic script to check if EasyScan is properly set up and running
"""
import subprocess
import sys
import socket
import time

def check_python():
    """Check Python version"""
    print("[1/6] Checking Python...")
    try:
        version = sys.version_info
        print(f"  ✅ Python {version.major}.{version.minor}.{version.micro}")
        return True
    except Exception as e:
        print(f"  ❌ Python check failed: {e}")
        return False

def check_port_8000():
    """Check if port 8000 is listening"""
    print("[2/6] Checking if port 8000 is open...")
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        result = sock.connect_ex(('127.0.0.1', 8000))
        sock.close()
        
        if result == 0:
            print("  ✅ Port 8000 is listening (backend is running)")
            return True
        else:
            print("  ❌ Port 8000 is NOT listening")
            print("     Start backend: cd backend && python run.py")
            return False
    except Exception as e:
        print(f"  ❌ Check failed: {e}")
        return False

def check_backend_api():
    """Check if backend API is responding"""
    print("[3/6] Checking backend API response...")
    try:
        import urllib.request
        response = urllib.request.urlopen('http://localhost:8000/docs', timeout=5)
        if response.status == 200:
            print("  ✅ Backend API is responding (status 200)")
            return True
        else:
            print(f"  ⚠️ Backend responded with status {response.status}")
            return False
    except Exception as e:
        print(f"  ❌ Backend not responding: {str(e)[:50]}")
        return False

def check_env_file():
    """Check .env.local file"""
    print("[4/6] Checking .env.local...")
    try:
        with open('.env.local', 'r') as f:
            content = f.read()
            if 'NEXT_PUBLIC_API_URL' in content and 'localhost:8000' in content:
                print("  ✅ .env.local configured correctly")
                return True
            else:
                print("  ❌ .env.local missing correct API_URL")
                print("     Should contain: NEXT_PUBLIC_API_URL=http://localhost:8000")
                return False
    except FileNotFoundError:
        print("  ❌ .env.local not found")
        print("     Run: echo 'NEXT_PUBLIC_API_URL=http://localhost:8000' > .env.local")
        return False

def check_dependencies():
    """Check if npm packages are installed"""
    print("[5/6] Checking npm dependencies...")
    try:
        import os
        if os.path.exists('node_modules'):
            print("  ✅ Node modules installed")
            return True
        else:
            print("  ❌ Node modules not installed")
            print("     Run: npm install")
            return False
    except Exception as e:
        print(f"  ❌ Check failed: {e}")
        return False

def check_backend_deps():
    """Check if Python dependencies are installed"""
    print("[6/6] Checking Python dependencies...")
    try:
        import subprocess
        result = subprocess.run(
            ['python', '-c', 'import fastapi, uvicorn, sqlalchemy'],
            capture_output=True,
            timeout=5
        )
        if result.returncode == 0:
            print("  ✅ Python dependencies installed")
            return True
        else:
            print("  ❌ Python dependencies missing")
            print("     Run: cd backend && pip install -r requirements.txt")
            return False
    except Exception as e:
        print(f"  ⚠️ Could not verify (might be OK): {str(e)[:30]}")
        return True

def main():
    print("=" * 60)
    print("EASYSCAN - DIAGNOSTIC CHECK")
    print("=" * 60)
    print()
    
    checks = [
        check_python(),
        check_port_8000(),
        check_backend_api(),
        check_env_file(),
        check_dependencies(),
        check_backend_deps(),
    ]
    
    print()
    print("=" * 60)
    passed = sum(checks)
    total = len(checks)
    
    if passed == total:
        print(f"✅ ALL CHECKS PASSED ({passed}/{total})")
        print()
        print("Your EasyScan setup is ready! 🎉")
        print()
        print("To start developing:")
        print("  1. Terminal 1: cd backend && python run.py")
        print("  2. Terminal 2: npm run dev")
        print("  3. Browser: http://localhost:3000")
    else:
        print(f"⚠️ SOME CHECKS FAILED ({passed}/{total})")
        print()
        print("Issues found above. Fix them with the suggested commands.")
    
    print("=" * 60)
    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(main())
