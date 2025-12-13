"""
Dependencies for route protection
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import Optional
import logging
from app.database.connection import get_db
from app.models.user import User
from app.core.security import decode_token

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current authenticated user from JWT token
    """
    logger.info(f"[get_current_user] Attempting to decode token...")
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = decode_token(token)
        if payload is None:
            logger.warning(f"[get_current_user] Token decode returned None")
            raise credentials_exception
        
        logger.info(f"[get_current_user] Token decoded successfully: {payload}")
        
        # Check token type
        if payload.get("type") != "access":
            logger.warning(f"[get_current_user] Invalid token type: {payload.get('type')}")
            raise credentials_exception
        
        user_id: str = payload.get("sub")
        if user_id is None:
            logger.warning(f"[get_current_user] No user ID in token")
            raise credentials_exception
        
        logger.info(f"[get_current_user] Looking up user with ID: {user_id}")
        user = db.query(User).filter(User.id == user_id).first()
        
        if user is None:
            logger.warning(f"[get_current_user] User not found with ID: {user_id}")
            raise credentials_exception
        
        logger.info(f"[get_current_user] User found: {user.email}")
        return user
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[get_current_user] Unexpected error: {str(e)}", exc_info=True)
        raise credentials_exception


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current active user (can add additional checks here)
    """
    return current_user

