# Smart Invoice Scanner - Backend API

FastAPI backend for the Smart Invoice Scanner application. This backend provides OCR capabilities for invoice processing and a RESTful API for invoice management.

## Features

- **OCR Processing**: Extract text from invoice images using Tesseract OCR
- **Data Extraction**: Automatically extract structured data (vendor, dates, amounts, line items)
- **Invoice Management**: Full CRUD operations for invoices
- **PostgreSQL Database**: Robust data storage with SQLAlchemy ORM
- **RESTful API**: Clean, well-documented API endpoints
- **CORS Enabled**: Ready for frontend integration
- **Error Handling**: Comprehensive error handling and logging

## Tech Stack

- **FastAPI**: Modern, fast web framework
- **PostgreSQL**: Relational database
- **SQLAlchemy**: ORM for database operations
- **Pytesseract**: OCR engine wrapper
- **OpenCV**: Image preprocessing
- **Pillow**: Image processing

## Prerequisites

1. **Python 3.9+**
2. **PostgreSQL** (12+)
3. **Tesseract OCR**

### Installing Tesseract OCR

#### Windows:
1. Download installer from: https://github.com/UB-Mannheim/tesseract/wiki
2. Install to default location: `C:\Program Files\Tesseract-OCR`
3. Add to PATH or set environment variable

#### macOS:
```bash
brew install tesseract
```

#### Linux (Ubuntu/Debian):
```bash
sudo apt-get update
sudo apt-get install tesseract-ocr
```

#### Linux (CentOS/RHEL):
```bash
sudo yum install tesseract
```

## Installation

1. **Navigate to backend directory:**
```bash
cd backend
```

2. **Create virtual environment:**
```bash
python -m venv venv
```

3. **Activate virtual environment:**

Windows:
```bash
venv\Scripts\activate
```

macOS/Linux:
```bash
source venv/bin/activate
```

4. **Install dependencies:**
```bash
pip install -r requirements.txt
```

5. **Set up environment variables:**
```bash
cp .env.example .env
```

Edit `.env` and set your database URL:
```
DATABASE_URL=postgresql://username:password@localhost:5432/invoice_scanner
```

6. **Create PostgreSQL database:**
```sql
CREATE DATABASE invoice_scanner;
```

Or using command line:
```bash
createdb invoice_scanner
```

7. **Run database migrations (tables will be created automatically on first run):**
The application will automatically create tables on startup. Alternatively, you can use Alembic for migrations.

## Running the Application

### Development Mode:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Or using Python:
```bash
python -m app.main
```

The API will be available at: `http://localhost:8000`

### API Documentation:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints

### OCR Endpoints

#### `POST /api/ocr/upload`
Upload an invoice image for OCR processing.

**Request:**
- Content-Type: `multipart/form-data`
- Body: Image file (JPG, PNG, etc., max 10MB)

**Response:**
```json
{
  "success": true,
  "filename": "invoice.jpg",
  "raw_text": "Extracted text...",
  "extracted_fields": {
    "vendor": "Company Name",
    "invoice_number": "INV-001",
    "date": "2024-01-15",
    "total": 1250.50,
    "subtotal": 1000.00,
    "tax": 200.00,
    "discount": 0.0,
    "items": [...]
  }
}
```

### Invoice Endpoints

#### `POST /api/invoices`
Create a new invoice.

**Request Body:**
```json
{
  "invoice_number": "INV-001",
  "vendor": "Company Name",
  "total": 1250.50,
  "status": "Pending Review"
}
```

#### `GET /api/invoices`
Get list of invoices with pagination and filtering.

**Query Parameters:**
- `skip`: Number of records to skip (default: 0)
- `limit`: Number of records to return (default: 100, max: 1000)
- `status`: Filter by status (optional)
- `search`: Search in invoice number or vendor (optional)

#### `GET /api/invoices/{id}`
Get a single invoice by ID.

#### `PUT /api/invoices/{id}`
Update an existing invoice.

#### `DELETE /api/invoices/{id}`
Delete an invoice.

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── ocr.py          # OCR endpoints
│   │   └── invoices.py     # Invoice CRUD endpoints
│   ├── services/
│   │   ├── ocr_service.py  # OCR processing logic
│   │   └── data_extractor.py  # Data extraction coordination
│   ├── models/
│   │   └── invoice.py      # Database models
│   ├── database/
│   │   └── connection.py   # Database connection
│   └── main.py             # FastAPI application
├── requirements.txt
├── .env.example
└── README.md
```

## Configuration

### Database Connection
Set the `DATABASE_URL` environment variable:
```
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

### CORS
CORS is configured to allow requests from:
- `http://localhost:3000` (Next.js default)
- `http://localhost:3001`

To add more origins, edit `app/main.py` and add to the `allow_origins` list.

## Troubleshooting

### Tesseract not found
If you get an error about Tesseract not being found:

**Windows:**
- Ensure Tesseract is installed
- Add to PATH or set: `pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'`

**Linux/Mac:**
- Ensure Tesseract is installed and in PATH
- Check with: `which tesseract`

### Database connection errors
- Verify PostgreSQL is running
- Check database exists
- Check credentials in `.env` file

### Image processing errors
- Ensure uploaded files are valid images
- Check file size (max 10MB)
- Supported formats: JPG, PNG, JPEG, etc.

## Development

### Adding new endpoints
1. Create route handler in appropriate file under `app/api/`
2. Add router to `app/main.py`
3. Update this README if needed

### Database migrations
The app auto-creates tables. For production, consider using Alembic migrations:
```bash
alembic init alembic
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

## Production Deployment

1. Set proper environment variables
2. Use a production ASGI server (Gunicorn with Uvicorn workers)
3. Set up proper database connection pooling
4. Configure CORS for production domain
5. Set up logging to files
6. Use environment-specific settings

Example production command:
```bash
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## License

This project is part of the Smart Invoice Scanner application.

