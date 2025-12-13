# Quick Fix for Database Connection

## The Issue
Your PostgreSQL password doesn't match what's in the `.env` file.

## Fastest Solution

1. **Open `backend/.env` file** and update the password:

   Current (wrong):
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/invoice_scanner
   ```

   Update to (replace YOUR_PASSWORD):
   ```
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/invoice_scanner
   ```

2. **Make sure database exists**:
   ```bash
   psql -U postgres
   # Enter your password when prompted
   CREATE DATABASE invoice_scanner;
   \q
   ```

3. **Initialize tables**:
   ```bash
   cd backend
   python init_db.py
   ```

4. **Start backend**:
   ```bash
   python run.py
   ```

## Don't Know Your PostgreSQL Password?

Try these common defaults:
- `postgres`
- `admin`
- `password`
- `root`
- (empty/no password)

Or reset it (see FIX_DATABASE_CONNECTION.md for detailed instructions).

## Test Connection

After updating `.env`, test:
```bash
cd backend
python -c "from app.database.connection import engine; engine.connect(); print('Success!')"
```

If it works, you're ready to start the server!

