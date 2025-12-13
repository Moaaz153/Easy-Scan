"""
Setup script for initializing the database
"""
import os
import sys
from sqlalchemy import create_engine, text
from app.database.connection import DATABASE_URL, Base, engine

# Import all models to ensure they're registered
from app.models.user import User
from app.models.invoice import Invoice

def setup_database():
    """Create database tables"""
    try:
        print("Creating database tables...")
        print("This will create: users, invoices tables")
        Base.metadata.create_all(bind=engine)
        print("✓ Database tables created successfully!")
        return True
    except Exception as e:
        print(f"✗ Error creating tables: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("Setting up Smart Invoice Scanner Backend...")
    print(f"Database URL: {DATABASE_URL}")
    
    if setup_database():
        print("\n✓ Setup completed successfully!")
        sys.exit(0)
    else:
        print("\n✗ Setup failed!")
        sys.exit(1)

