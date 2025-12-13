# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites Check
- ✅ Python 3.9+ installed
- ✅ Node.js 18+ installed
- ✅ PostgreSQL running
- ✅ Tesseract OCR installed

### Step 1: Backend Setup (2 minutes)

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Generate secret key
python generate_secret_key.py
# Copy the output and add to .env file

# Create .env file
# Copy .env.example to .env and edit:
# - DATABASE_URL=postgresql://postgres:password@localhost:5432/invoice_scanner
# - SECRET_KEY=paste-generated-key-here

# Create database (if not exists)
createdb invoice_scanner

# Initialize tables
python init_db.py

# Verify setup
python verify_setup.py

# Start server
python run.py
```

Backend running on: **http://localhost:8000**

### Step 2: Frontend Setup (1 minute)

```bash
# From project root
npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Start frontend
npm run dev
```

Frontend running on: **http://localhost:3000**

### Step 3: Test It! (2 minutes)

1. **Signup**: Go to http://localhost:3000/signup
   - Create an account
   - Redirects to login

2. **Login**: Go to http://localhost:3000/login
   - Enter credentials
   - Redirects to dashboard

3. **Upload Invoice**: Click "Upload" in navbar
   - Upload an image
   - See OCR results
   - Save invoice

4. **View Invoices**: Click "Invoices" in navbar
   - See your saved invoices

## ✅ Done!

Your Smart Invoice Scanner is now running with full authentication!

## 🆘 Troubleshooting

### Backend Issues
```bash
# Check if everything is set up
cd backend
python verify_setup.py

# If tables missing:
python init_db.py

# If dependencies missing:
pip install -r requirements.txt
```

### Frontend Issues
```bash
# Clear cache and reinstall
rm -rf .next node_modules
npm install
npm run dev
```

### Database Issues
```bash
# Check PostgreSQL is running
# Windows: Check Services
# Mac: brew services list
# Linux: sudo systemctl status postgresql

# Create database if missing
createdb invoice_scanner
```

## 📚 More Help

- Full documentation: See `README.md`
- Setup details: See `SETUP_COMPLETE.md`
- Authentication: See `AUTHENTICATION_SUMMARY.md`

