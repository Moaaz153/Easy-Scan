"""
Database initialization script
Creates all tables including users and invoices
"""
import os
import sys
from sqlalchemy import create_engine, text
from app.database.connection import DATABASE_URL, Base, engine
from app.models import user, invoice

def init_database():
    """Create all database tables"""
    try:
        print("Initializing database...")
        print(f"Database URL: {DATABASE_URL}")
        
        # Import all models to ensure they're registered
        from app.models.user import User
        from app.models.invoice import Invoice
        
        print("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        print("✓ Database tables created successfully!")
        
        # Verify tables exist
        with engine.connect() as conn:
            # Use database-specific queries
            if DATABASE_URL.startswith("sqlite"):
                result = conn.execute(text("""
                    SELECT name 
                    FROM sqlite_master 
                    WHERE type='table' AND name NOT LIKE 'sqlite_%'
                """))
            else:
                result = conn.execute(text("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public'
                """))
            tables = [row[0] for row in result]
            print(f"\nCreated tables: {', '.join(tables)}")
        
        return True
    except Exception as e:
        print(f"✗ Error initializing database: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("Smart Invoice Scanner - Database Initialization")
    print("=" * 50)
    
    if init_database():
        print("\n✓ Database initialization completed successfully!")
        print("\nNext steps:")
        print("1. Start the backend server: python run.py")
        print("2. The API will be available at http://localhost:8000")
        sys.exit(0)
    else:
        print("\n✗ Database initialization failed!")
        print("\nTroubleshooting:")
        print("1. Ensure PostgreSQL is running")
        print("2. Check DATABASE_URL in .env file")
        print("3. Verify database 'invoice_scanner' exists")
        sys.exit(1)

