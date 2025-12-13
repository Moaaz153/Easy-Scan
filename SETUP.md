# Quick Setup Guide

## Step 1: Backend Setup

```bash
# Navigate to backend
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Create .env file
# Copy .env.example to .env and edit:
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/invoice_scanner

# Create database
createdb invoice_scanner

# Initialize database
python setup.py

# Run backend
python run.py
```

Backend runs on: http://localhost:8000

## Step 2: Frontend Setup

```bash
# From project root
npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Run frontend
npm run dev
```

Frontend runs on: http://localhost:3000

## Step 3: Test the Application

1. Open http://localhost:3000
2. Go to "Upload Invoice"
3. Upload an invoice image
4. Review extracted data
5. Save the invoice
6. View it in the invoices list

## Troubleshooting

### Backend won't start
- Check PostgreSQL is running
- Verify database exists
- Check .env file has correct DATABASE_URL

### Frontend can't connect to backend
- Ensure backend is running on port 8000
- Check NEXT_PUBLIC_API_URL in .env.local
- Restart frontend after changing .env.local

### OCR not working
- Install Tesseract OCR
- Add to PATH (Windows)
- Restart backend after installing

