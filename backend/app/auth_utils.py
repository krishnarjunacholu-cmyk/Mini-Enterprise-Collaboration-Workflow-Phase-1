"""
Authentication utilities for password hashing and JWT token management.
Handles all cryptographic operations and token creation/verification.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
import bcrypt
from jose import JWTError, jwt
from app.config import get_settings

# Settings
settings = get_settings()


# ============================================================================
# Password Hashing Functions
# ============================================================================

def hash_password(password: str) -> str:
    """
    Hash a plain text password using bcrypt.
    
    Args:
        password: Plain text password to hash
        
    Returns:
        Hashed password string
        
    Note:
        Never store plain text passwords in database.
        Always use this function before saving password.
    """
    password_bytes = password.encode("utf-8")
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain text password against a hashed password.
    
    Args:
        plain_password: Plain text password from user input
        hashed_password: Hashed password from database
        
    Returns:
        True if password matches, False otherwise
        
    Usage:
        if verify_password(user_input, user.hashed_password):
            # Password is correct
    """
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


# ============================================================================
# JWT Token Functions
# ============================================================================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Dictionary containing token claims (e.g., {"sub": user_id})
        expires_delta: Optional token expiration time. 
                      If None, uses ACCESS_TOKEN_EXPIRE_MINUTES from config.
        
    Returns:
        Encoded JWT token string
        
    Usage:
        token = create_access_token({"sub": str(user.id)})
    """
    # Create a copy to avoid modifying original dict
    to_encode = data.copy()
    
    # Calculate expiration time
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    # Add expiration claim
    to_encode.update({"exp": expire})
    
    # Encode token with secret key
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decode and validate a JWT access token.
    
    Args:
        token: JWT token string to decode
        
    Returns:
        Dictionary containing token claims if valid, None if invalid
        
    Raises:
        JWTError: If token is invalid or expired
        
    Usage:
        payload = decode_access_token(token)
        if payload:
            user_id = payload.get("sub")
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError:
        return None
