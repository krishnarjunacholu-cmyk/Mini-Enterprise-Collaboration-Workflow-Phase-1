"""
Dependency functions for FastAPI endpoints.
Handles JWT verification and role-based access control.
"""

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.auth_utils import decode_access_token

# HTTP Bearer authentication scheme
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

security = HTTPBearer(auto_error=False)


def is_admin(user: User) -> bool:
    return user.role == "admin"


def is_manager(user: User) -> bool:
    return user.role == "manager"


def is_employee(user: User) -> bool:
    return user.role == "employee"


def get_token_from_header(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> str:
    """
    Extract JWT token from Authorization header.
    Expected format: "Bearer <token>"
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return credentials.credentials


def get_current_user(
    token: str = Depends(get_token_from_header),
    db: Session = Depends(get_db)
) -> User:
    """
    Get the current authenticated user from JWT token.
    This is a protected dependency that validates the Bearer token.
    
    Args:
        token: JWT token from Authorization header
        db: Database session
        
    Returns:
        User object if token is valid
        
    Raises:
        HTTPException: 401 if token is invalid, expired, or user not found
        
    Usage:
        @app.get("/users/me")
        def get_me(current_user: User = Depends(get_current_user)):
            return current_user
    """
    # Decode token
    payload = decode_access_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Extract user ID from token
    user_id: str = payload.get("sub")
    
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token claims",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        user_id = int(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency to ensure user has admin role.
    Use this when only admins should access an endpoint.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        User object if user is admin
        
    Raises:
        HTTPException: 403 if user is not admin
        
    Usage:
        @app.get("/admin/users")
        def get_all_users(admin: User = Depends(require_admin)):
            # Only admins can access this
    """
    if not is_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin users can access this resource"
        )
    return current_user


def require_manager_or_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency to ensure user has manager or admin role.
    Use this when managers and admins should access an endpoint.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        User object if user is manager or admin
        
    Raises:
        HTTPException: 403 if user is not manager or admin
        
    Usage:
        @app.get("/tasks")
        def get_tasks(manager: User = Depends(require_manager_or_admin)):
            # Only managers and admins can access this
    """
    if not (is_manager(current_user) or is_admin(current_user)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managers and admins can access this resource"
        )
    return current_user


def require_employee(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency to ensure user has employee role.
    """
    if not is_employee(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employee users can access this resource"
        )
    return current_user
