# Fix Authentication Issues (Login/Signup)

If you're experiencing issues with login or signup, follow these steps:

## Quick Fix Steps

### Step 1: Verify Database Exists

The application uses SQLite by default (file: `invoice_scanner.db` in the backend directory).

**Check if database file exists:**
```bash
cd backend
ls invoice_scanner.db  # On Windows: dir invoice_scanner.db
```

If the file doesn't exist, it will be created automatically when you run the app.

### Step 2: Initialize Database

Run the database initialization script:

```bash
cd backend
python init_db.py
```

This will create all necessary tables including:
- `users` table (for authentication)
- `invoices` table (for invoice data)

### Step 3: Run Database Migration (if needed)

If you've updated the code and the database already exists, run the migration script to add new columns:

```bash
cd backend
python migrate_db.py
```

This will safely add any missing columns to existing tables.

### Step 4: Test Database Setup

Run the test script to verify everything is working:

```bash
cd backend
python test_auth_db.py
```

This will:
- Test database connection
- Verify tables exist
- Test user creation
- Check for missing columns

### Step 5: Start the Backend Server

```bash
cd backend
python run.py
```

Or using uvicorn directly:
```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Step 6: Verify Backend is Running

Open your browser and go to:
- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

You should see the API documentation or a health status message.

## Common Issues and Solutions

### Issue 1: "Table 'users' does not exist"

**Solution:**
```bash
cd backend
python init_db.py
```

### Issue 2: "No such column: bill_to_name" (or similar)

**Solution:**
```bash
cd backend
python migrate_db.py
```

### Issue 3: "Database is locked" (SQLite)

**Solution:**
- Make sure no other process is using the database
- Close any database browser tools
- Restart the backend server

### Issue 4: "Module not found" errors

**Solution:**
```bash
cd backend
pip install -r requirements.txt
```

### Issue 5: "SECRET_KEY" warnings

**Solution:**
Generate a secret key:
```bash
cd backend
python generate_secret_key.py
```

Then add it to your `.env` file:
```
SECRET_KEY=your-generated-key-here
```

### Issue 6: CORS errors in browser

**Solution:**
Make sure the frontend URL is in the CORS allowed origins in `backend/app/main.py`. Default includes:
- http://localhost:3000
- http://localhost:3001

## Manual Database Reset (if needed)

If you need to completely reset the database:

```bash
cd backend
python recreate_db.py
```

**WARNING:** This will delete all existing data!

## Verify Authentication Endpoints

Once the backend is running, test the endpoints:

### Signup:
```bash
curl -X POST "http://localhost:8000/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Test User",
    "email": "test@example.com",
    "password": "testpass123"
  }'
```

### Login:
```bash
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123"
  }'
```

You should receive an access token and refresh token.

## Still Having Issues?

1. Check the backend logs for error messages
2. Verify all dependencies are installed: `pip install -r requirements.txt`
3. Check that the database file has proper permissions
4. Ensure port 8000 is not already in use
5. Check the `.env` file for correct DATABASE_URL

## Database Schema

The `users` table should have these columns:
- `id` (String, Primary Key)
- `full_name` (String)
- `email` (String, Unique)
- `hashed_password` (String)
- `created_at` (DateTime)

If any of these are missing, run `python init_db.py`.

