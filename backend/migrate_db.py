"""
Database migration script to add new columns to existing tables
This script safely adds new columns (bill_to_name, bill_to_address, tax_amount) to the invoices table
"""
import os
import sys
from sqlalchemy import create_engine, text, inspect
from app.database.connection import DATABASE_URL, engine

def migrate_database():
    """Add new columns to existing tables if they don't exist"""
    try:
        print("Checking database schema...")
        print(f"Database URL: {DATABASE_URL}")
        
        inspector = inspect(engine)
        
        # Check if invoices table exists
        if 'invoices' in inspector.get_table_names():
            print("\nFound 'invoices' table. Checking columns...")
            
            # Get existing columns
            existing_columns = [col['name'] for col in inspector.get_columns('invoices')]
            print(f"Existing columns: {', '.join(existing_columns)}")
            
            # Columns to add
            columns_to_add = []
            
            if 'bill_to_name' not in existing_columns:
                columns_to_add.append(('bill_to_name', 'VARCHAR(255)'))
            
            if 'bill_to_address' not in existing_columns:
                columns_to_add.append(('bill_to_address', 'TEXT'))
            
            if 'tax_amount' not in existing_columns:
                columns_to_add.append(('tax_amount', 'FLOAT'))
            
            # Add missing columns
            if columns_to_add:
                print(f"\nAdding {len(columns_to_add)} new column(s)...")
                with engine.connect() as conn:
                    for col_name, col_type in columns_to_add:
                        try:
                            if DATABASE_URL.startswith("sqlite"):
                                # SQLite ALTER TABLE syntax
                                conn.execute(text(f"ALTER TABLE invoices ADD COLUMN {col_name} {col_type}"))
                            else:
                                # PostgreSQL syntax
                                conn.execute(text(f"ALTER TABLE invoices ADD COLUMN {col_name} {col_type}"))
                            conn.commit()
                            print(f"  ✓ Added column: {col_name}")
                        except Exception as e:
                            # Column might already exist or other error
                            if "duplicate" in str(e).lower() or "already exists" in str(e).lower():
                                print(f"  - Column {col_name} already exists, skipping...")
                            else:
                                print(f"  ✗ Error adding column {col_name}: {str(e)}")
                                conn.rollback()
                print("\n✓ Migration completed!")
            else:
                print("\n✓ All columns already exist. No migration needed.")
        else:
            print("\n'invoices' table doesn't exist yet. It will be created on next app startup.")
        
        # Verify users table exists
        if 'users' in inspector.get_table_names():
            print("\n✓ 'users' table exists")
        else:
            print("\n⚠ 'users' table doesn't exist. Creating it...")
            from app.database.connection import Base
            from app.models.user import User
            Base.metadata.create_all(bind=engine, tables=[User.__table__])
            print("✓ 'users' table created")
        
        return True
    except Exception as e:
        print(f"\n✗ Error during migration: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("Database Migration Script")
    print("=" * 50)
    
    if migrate_database():
        print("\n✓ Migration completed successfully!")
        sys.exit(0)
    else:
        print("\n✗ Migration failed!")
        sys.exit(1)

