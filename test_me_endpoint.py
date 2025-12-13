#!/usr/bin/env python3
"""
Debug script to test the /api/auth/me endpoint
"""
import sys
sys.path.insert(0, 'backend')

import os
os.environ.setdefault('DATABASE_URL', 'sqlite:///./invoice_scanner.db')

from app.database.connection import SessionLocal, engine, Base
from app.models.user import User
from app.core.security import create_access_token
from datetime import timedelta

# Create tables
Base.metadata.create_all(bind=engine)

# Get a user from database
db = SessionLocal()
users = db.query(User).limit(5).all()

if not users:
    print("❌ No users found in database!")
    print("\nTo create a user, login/signup from the web app first.")
    sys.exit(1)

# Use first user
user = users[0]
print(f"✅ Found user: {user.email}")
print(f"   ID: {user.id}")
print(f"   Name: {user.full_name}")

# Create a token for this user
access_token_expires = timedelta(minutes=30)
token = create_access_token(
    data={"sub": str(user.id), "email": user.email},
    expires_delta=access_token_expires
)

print(f"\n✅ Generated test token:")
print(f"   {token[:50]}...")

# Test the endpoint with curl
print(f"\n📋 To test the /api/auth/me endpoint, run:")
print(f"""
# Option 1: From PowerShell
$token = '{token}'
$headers = @{{'Authorization' = "Bearer $token"}}
Invoke-WebRequest -Uri 'http://localhost:8000/api/auth/me' -Headers $headers -Method GET | ConvertFrom-Json

# Option 2: From Browser Console
fetch('http://localhost:8000/api/auth/me', {{
  headers: {{'Authorization': 'Bearer {token}'}}
}})
.then(r => r.json())
.then(console.log)
.catch(console.error)

# Option 3: From curl (if available)
curl -H "Authorization: Bearer {token}" http://localhost:8000/api/auth/me
""")

db.close()
