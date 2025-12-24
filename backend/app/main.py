"""
FastAPI main application
"""
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import logging
import sys
from contextlib import asynccontextmanager

from app.api import ocr, invoices, auth
from app.database.connection import engine, Base

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events
    """
    # Startup
    logger.info("Starting up application...")
    
    # Import all models to ensure they're registered with Base
    try:
        from app.models.user import User
        from app.models.invoice import Invoice
        logger.info("Models imported successfully")
    except Exception as e:
        logger.error(f"Error importing models: {str(e)}")
    
    # Create database tables
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created/verified")
        
        # Check if tables exist
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        logger.info(f"Database tables: {', '.join(tables)}")
        
        # If invoices table exists, check for new columns and add them if missing
        if 'invoices' in tables:
            existing_columns = [col['name'] for col in inspector.get_columns('invoices')]
            missing_columns = []
            
            if 'bill_to_name' not in existing_columns:
                missing_columns.append('bill_to_name')
            if 'bill_to_address' not in existing_columns:
                missing_columns.append('bill_to_address')
            if 'tax_amount' not in existing_columns:
                missing_columns.append('tax_amount')
            
            if missing_columns:
                logger.info(f"Adding missing columns to invoices table: {', '.join(missing_columns)}")
                from sqlalchemy import text
                with engine.begin() as conn:  # Use begin() for automatic transaction management
                    for col in missing_columns:
                        try:
                            if col == 'bill_to_name':
                                conn.execute(text("ALTER TABLE invoices ADD COLUMN bill_to_name VARCHAR(255)"))
                            elif col == 'bill_to_address':
                                conn.execute(text("ALTER TABLE invoices ADD COLUMN bill_to_address TEXT"))
                            elif col == 'tax_amount':
                                conn.execute(text("ALTER TABLE invoices ADD COLUMN tax_amount FLOAT DEFAULT 0.0"))
                            logger.info(f"  ✓ Added column: {col}")
                        except Exception as e:
                            error_msg = str(e).lower()
                            if "duplicate" in error_msg or "already exists" in error_msg or "duplicate column" in error_msg:
                                logger.info(f"  - Column {col} already exists, skipping...")
                            else:
                                logger.warning(f"  Could not add column {col}: {str(e)}")
    except Exception as e:
        logger.error(f"Error creating database tables: {str(e)}", exc_info=True)
    
    yield
    
    # Shutdown
    logger.info("Shutting down application...")


# Create FastAPI app
app = FastAPI(
    title="Smart Invoice Scanner API",
    description="Backend API for invoice OCR and management",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js default port
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        # Add production frontend URL here
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors"""
    logger.warning(f"Validation error: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": exc.errors(),
            "message": "Validation error"
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "message": str(exc) if str(exc) else "An unexpected error occurred"
        }
    )


# Include routers
app.include_router(auth.router)
app.include_router(ocr.router)
app.include_router(invoices.router)


# Health check endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Smart Invoice Scanner API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "invoice-scanner-api"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

