# Smart Invoice Scanner

A full-stack web application for scanning and managing invoices using OCR technology. Built with Next.js (frontend) and FastAPI (backend).

## Features

- 📄 **Invoice Upload**: Upload invoice images (JPG, PNG, PDF)
- 🔍 **OCR Processing**: Automatic text extraction using Tesseract OCR
- 📊 **Data Extraction**: Intelligent parsing of invoice fields (vendor, dates, amounts, line items)
- 💾 **Invoice Management**: Full CRUD operations for invoices
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🔄 **Real-time Updates**: Redux state management for seamless UX

## Tech Stack

### Frontend
- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Redux Toolkit** - State management
- **Axios** - HTTP client
- **Tailwind CSS** - Styling
- **React Toastify** - Notifications

### Backend
- **FastAPI** - Python web framework
- **PostgreSQL** - Database
- **SQLAlchemy** - ORM
- **Pytesseract** - OCR engine
- **OpenCV** - Image preprocessing

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ and npm
- **Python** 3.9+
- **PostgreSQL** 12+
- **Tesseract OCR**

### Installing Tesseract OCR

**Windows:**
1. Download from: https://github.com/UB-Mannheim/tesseract/wiki
2. Install to: `C:\Program Files\Tesseract-OCR`
3. Add to PATH or set environment variable

**macOS:**
```bash
brew install tesseract
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install tesseract-ocr
```

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd easyscan
```

### 2. Backend Setup

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

# Create .env file
cp .env.example .env

# Generate a secure secret key (optional but recommended)
python generate_secret_key.py
# Copy the generated key to your .env file

# Edit .env and set your database URL:
# DATABASE_URL=postgresql://postgres:your_password@localhost:5432/invoice_scanner
# SECRET_KEY=your-generated-secret-key-here

# Create PostgreSQL database
createdb invoice_scanner
# Or using psql:
# psql -U postgres
# CREATE DATABASE invoice_scanner;

# Initialize database tables (creates users and invoices tables)
python init_db.py
# Or use the simpler setup.py:
# python setup.py

# Run the backend server
python run.py
# Or:
uvicorn app.main:app --reload
```

The backend will be available at `http://localhost:8000`

### 3. Frontend Setup

```bash
# Navigate to project root
cd ..

# Install dependencies
npm install

# Create .env.local file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Run the development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Project Structure

```
easyscan/
├── app/                    # Next.js app directory
│   ├── upload-invoice/     # Invoice upload page
│   ├── invoices/           # Invoice list page
│   ├── invoice-detailes/   # Invoice detail page
│   └── layout.tsx          # Root layout
├── backend/                # FastAPI backend
│   ├── app/
│   │   ├── api/           # API endpoints
│   │   ├── services/      # Business logic
│   │   ├── models/        # Database models
│   │   └── database/      # Database connection
│   └── requirements.txt
├── services/               # Frontend API services
│   ├── api.ts             # Axios configuration
│   └── invoiceApi.ts      # Invoice API calls
├── lib/                    # Redux store and slices
│   ├── store.ts           # Redux store
│   └── features/          # Redux slices
└── utiles/                 # Utility functions
```

## Usage

### Upload Invoice

1. Navigate to `/upload-invoice`
2. Drag and drop an invoice image or click "Choose Files"
3. Wait for OCR processing
4. Review extracted data
5. Click "Save Invoice" to store in database

### View Invoices

1. Navigate to `/invoices`
2. Browse all invoices
3. Use search and filters to find specific invoices
4. Click on an invoice to view details

### Edit Invoice

1. Open an invoice from the list
2. Edit any fields (vendor, dates, line items, etc.)
3. Click "Save" to update

### Delete Invoice

1. Open the invoice list
2. Click the delete icon on any invoice
3. Confirm deletion

## API Endpoints

### OCR
- `POST /api/ocr/upload` - Upload and process invoice image

### Invoices
- `POST /api/invoices` - Create new invoice
- `GET /api/invoices` - List invoices (with pagination & filters)
- `GET /api/invoices/{id}` - Get single invoice
- `PUT /api/invoices/{id}` - Update invoice
- `DELETE /api/invoices/{id}` - Delete invoice

See backend README for detailed API documentation.

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/invoice_scanner
```

## Development

### Running in Development Mode

**Backend:**
```bash
cd backend
python run.py
```

**Frontend:**
```bash
npm run dev
```

### Building for Production

**Frontend:**
```bash
npm run build
npm start
```

**Backend:**
```bash
cd backend
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## Troubleshooting

### Backend Issues

**Tesseract not found:**
- Ensure Tesseract is installed and in PATH
- On Windows, check if path is set correctly

**Database connection error:**
- Verify PostgreSQL is running
- Check database credentials in `.env`
- Ensure database exists

### Frontend Issues

**API connection error:**
- Verify backend is running on port 8000
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Check CORS settings in backend

**Build errors:**
- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is part of a graduation project.

## Support

For issues and questions, please open an issue on GitHub.
