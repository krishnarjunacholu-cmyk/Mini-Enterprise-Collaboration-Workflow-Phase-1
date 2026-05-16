"""
Users router.
Handles user-related endpoints (get user by ID, list users, etc.).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import UserOut
from app.dependencies import get_current_user, require_admin

# Create router
router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get user details by ID.
    
    Protected endpoint - requires valid JWT token.
    
    Args:
        user_id: ID of the user to retrieve
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        UserOut: User details if found
        
    Raises:
        404: If user with given ID not found
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    
    return user


@router.get("/", response_model=list[UserOut])
def list_all_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    List all users in the system.
    
    Admin-only endpoint - only users with 'admin' role can access.
    Requires valid JWT token with admin role.
    
    Args:
        db: Database session
        admin: Current authenticated admin user
        
    Returns:
        list[UserOut]: List of all users
        
    Raises:
        403: If current user is not an admin
    """
    users = db.query(User).all()
    return users
