"""
Test script to verify database and authentication setup
"""
import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    print("=" * 50)
    print("Testing Database and Authentication Setup")
    print("=" * 50)
    
    # Test 1: Database connection
    print("\n1. Testing database connection...")
    from app.database.connection import engine, DATABASE_URL
    print(f"   Database URL: {DATABASE_URL}")
    
    from sqlalchemy import text
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print("   ✓ Database connection successful")
    
    # Test 2: Import models
    print("\n2. Testing model imports...")
    from app.models.user import User
    from app.models.invoice import Invoice
    print("   ✓ Models imported successfully")
    
    # Test 3: Create tables
    print("\n3. Creating/verifying database tables...")
    from app.database.connection import Base
    Base.metadata.create_all(bind=engine)
    print("   ✓ Tables created/verified")
    
    # Test 4: Check if tables exist
    print("\n4. Verifying tables exist...")
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"   Found tables: {', '.join(tables)}")
    
    if 'users' not in tables:
        print("   ✗ ERROR: 'users' table not found!")
        sys.exit(1)
    else:
        print("   ✓ 'users' table exists")
    
    if 'invoices' not in tables:
        print("   ⚠ WARNING: 'invoices' table not found (will be created on first use)")
    else:
        print("   ✓ 'invoices' table exists")
        
        # Check for new columns
        existing_columns = [col['name'] for col in inspector.get_columns('invoices')]
        print(f"   Invoice columns: {', '.join(existing_columns)}")
        
        missing = []
        if 'bill_to_name' not in existing_columns:
            missing.append('bill_to_name')
        if 'bill_to_address' not in existing_columns:
            missing.append('bill_to_address')
        if 'tax_amount' not in existing_columns:
            missing.append('tax_amount')
        
        if missing:
            print(f"   ⚠ Missing columns: {', '.join(missing)}")
            print("   Run: python migrate_db.py to add them")
    
    # Test 5: Test user creation
    print("\n5. Testing user creation...")
    from sqlalchemy.orm import Session
    from app.database.connection import SessionLocal
    from app.core.security import get_password_hash
    
    db = SessionLocal()
    try:
        # Try to create a test user (will fail if email exists, that's OK)
        test_email = "test@example.com"
        existing = db.query(User).filter(User.email == test_email).first()
        if existing:
            print(f"   Test user already exists (email: {test_email})")
            db.delete(existing)
            db.commit()
        
        test_user = User(
            full_name="Test User",
            email=test_email,
            hashed_password=get_password_hash("testpass123")
        )
        db.add(test_user)
        db.commit()
        db.refresh(test_user)
        print(f"   ✓ Test user created successfully (ID: {test_user.id})")
        
        # Clean up
        db.delete(test_user)
        db.commit()
        print("   ✓ Test user cleaned up")
    except Exception as e:
        print(f"   ✗ ERROR creating test user: {str(e)}")
        db.rollback()
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()
    
    print("\n" + "=" * 50)
    print("✓ All tests passed! Database is ready.")
    print("=" * 50)
    
except Exception as e:
    print(f"\n✗ ERROR: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

