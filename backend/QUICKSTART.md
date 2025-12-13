# Quick Start Guide

## Step-by-Step Setup

### 1. Install Tesseract OCR

**Windows:**
1. Download from: https://github.com/UB-Mannheim/tesseract/wiki
2. Install to: `C:\Program Files\Tesseract-OCR`
3. Add to PATH or set environment variable `TESSERACT_CMD`

**macOS:**
```bash
brew install tesseract
```

**Linux:**
```bash
sudo apt-get install tesseract-ocr  # Ubuntu/Debian
sudo yum install tesseract          # CentOS/RHEL
```

### 2. Install PostgreSQL

**Windows:**
- Download from: https://www.postgresql.org/download/windows/
- Install and remember your password

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Linux:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 3. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE invoice_scanner;

# Exit
\q
```

### 4. Setup Python Environment

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 5. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env and set your database URL
# DATABASE_URL=postgresql://postgres:your_password@localhost:5432/invoice_scanner
```

### 6. Initialize Database

```bash
python setup.py
```

### 7. Run the Server

```bash
python run.py
```

Or:
```bash
uvicorn app.main:app --reload
```

### 8. Test the API

Open your browser and visit:
- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

## Testing Endpoints

### Test OCR Upload (using curl):

```bash
curl -X POST "http://localhost:8000/api/ocr/upload" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/path/to/invoice.jpg"
```

### Test Create Invoice:

```bash
curl -X POST "http://localhost:8000/api/invoices" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice_number": "INV-001",
    "vendor": "Test Company",
    "total": 1000.00,
    "status": "Pending Review"
  }'
```

### Test Get Invoices:

```bash
curl "http://localhost:8000/api/invoices"
```

## Troubleshooting

### Tesseract Not Found (Windows)
If you get `TesseractNotFoundError`:

1. Check if Tesseract is installed
2. Add to PATH or uncomment the Windows path configuration in `app/services/ocr_service.py`

### Database Connection Error
- Verify PostgreSQL is running
- Check database exists: `psql -U postgres -l`
- Verify credentials in `.env`

### Port Already in Use
Change port in `run.py` or use:
```bash
uvicorn app.main:app --port 8001
```

## Next Steps

1. Connect your frontend to `http://localhost:8000`
2. Update CORS settings in `app/main.py` if needed
3. Review API documentation at `/docs`

