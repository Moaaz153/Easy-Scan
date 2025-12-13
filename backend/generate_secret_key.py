"""
Generate a secure secret key for JWT tokens
"""
import secrets

def generate_secret_key():
    """Generate a secure random secret key"""
    key = secrets.token_urlsafe(32)
    print("Generated SECRET_KEY:")
    print(key)
    print("\nAdd this to your .env file:")
    print(f"SECRET_KEY={key}")
    return key

if __name__ == "__main__":
    generate_secret_key()

