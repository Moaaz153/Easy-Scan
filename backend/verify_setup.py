"""
Verification script to check if everything is set up correctly
"""
import sys
import os

# Ensure UTF-8 output on Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def check_dependencies():
    """Check if all required packages are installed"""
    print("Checking Python dependencies...")
    required_packages = [
        'fastapi',
        'uvicorn',
        'sqlalchemy',
        'psycopg2',
        'pytesseract',
        'PIL',
        'cv2',
        'jose',
        'passlib',
    ]
    
    missing = []
    for package in required_packages:
        try:
            if package == 'PIL':
                __import__('PIL')
            elif package == 'cv2':
                __import__('cv2')
            elif package == 'jose':
                __import__('jose')
            else:
                __import__(package)
            print(f"  [OK] {package}")
        except ImportError:
            print(f"  [MISSING] {package}")
            missing.append(package)
    
    if missing:
        print(f"\n[ERROR] Missing packages: {', '.join(missing)}")
        print("Run: pip install -r requirements.txt")
        return False
    else:
        print("\n[OK] All dependencies installed!")
        return True

def check_env_file():
    """Check if .env file exists"""
    print("\nChecking environment configuration...")
    if os.path.exists('.env'):
        print("  [OK] .env file exists")
        
        # Check for important variables
        with open('.env', 'r') as f:
            content = f.read()
            if 'DATABASE_URL' in content:
                print("  [OK] DATABASE_URL configured")
            else:
                print("  [WARNING] DATABASE_URL not found in .env")
            
            if 'SECRET_KEY' in content and 'your-secret-key' not in content:
                print("  [OK] SECRET_KEY configured")
            else:
                print("  [WARNING] SECRET_KEY not set or using default (not recommended for production)")
        
        return True
    else:
        print("  [ERROR] .env file not found")
        print("  Create it by copying .env.example")
        return False

def check_database_connection():
    """Check if database connection works"""
    print("\nChecking database connection...")
    try:
        from app.database.connection import engine, DATABASE_URL
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print(f"  [OK] Database connection successful")
        print(f"  Database URL: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else 'configured'}")
        return True
    except Exception as e:
        print(f"  [ERROR] Database connection failed: {str(e)}")
        print("  Make sure PostgreSQL is running and DATABASE_URL is correct")
        return False

def check_tables():
    """Check if tables exist"""
    print("\nChecking database tables...")
    try:
        from app.database.connection import engine
        from sqlalchemy import text
        
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            """))
            tables = [row[0] for row in result]
            
            required_tables = ['users', 'invoices']
            for table in required_tables:
                if table in tables:
                    print(f"  [OK] {table} table exists")
                else:
                    print(f"  [ERROR] {table} table missing")
                    return False
            
            return True
    except Exception as e:
        print(f"  [ERROR] Error checking tables: {str(e)}")
        return False

def main():
    print("=" * 60)
    print("Smart Invoice Scanner - Setup Verification")
    print("=" * 60)
    
    all_ok = True
    
    # Check dependencies
    if not check_dependencies():
        all_ok = False
    
    # Check .env file
    if not check_env_file():
        all_ok = False
    
    # Check database connection
    if not check_database_connection():
        all_ok = False
    else:
        # Only check tables if connection works
        if not check_tables():
            print("\n[WARNING] Tables missing. Run: python init_db.py")
            all_ok = False
    
    print("\n" + "=" * 60)
    if all_ok:
        print("[OK] All checks passed! Setup is complete.")
        print("\nYou can now start the server:")
        print("  python run.py")
    else:
        print("[ERROR] Some checks failed. Please fix the issues above.")
        print("\nQuick fixes:")
        print("  1. Install dependencies: pip install -r requirements.txt")
        print("  2. Create .env file: cp .env.example .env")
        print("  3. Initialize database: python init_db.py")
    print("=" * 60)
    
    sys.exit(0 if all_ok else 1)

if __name__ == "__main__":
    main()

