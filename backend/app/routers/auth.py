"""
Authentication router.
Handles user registration, login, and authentication endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import UserCreate, UserLogin, UserOut, Token
from app.auth_utils import hash_password, verify_password, create_access_token
from app.dependencies import get_current_user

# Create router
router = APIRouter(prefix="/auth", tags=["Authentication"])

# Allowed roles
ALLOWED_ROLES = {"admin", "manager", "employee"}


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user.
    
    Business Rules:
        - Email must be unique (no duplicates allowed)
        - Password must be hashed before storing
        - Role must be one of: admin, manager, employee
        - New users are active by default
    
    Args:
        user_data: User registration data (name, email, password, role)
        db: Database session
        
    Returns:
        UserOut: Created user details (without password)
        
    Raises:
        400: If email already exists or role is invalid
    """
    # Validate role
    if user_data.role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Allowed roles are: {', '.join(ALLOWED_ROLES)}"
        )
    
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password (NEVER store plain text passwords)
    hashed_password = hash_password(user_data.password)
    
    # Create new user
    new_user = User(
        name=user_data.name,
        email=user_data.email,
        hashed_password=hashed_password,
        role=user_data.role,
        is_active=True
    )
    
    # Save to database
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Login user and return JWT access token.
    
    Process:
        1. Find user by email
        2. Verify password using bcrypt
        3. Check if user is active
        4. Generate and return JWT token
    
    Args:
        credentials: Login credentials (email and password)
        db: Database session
        
    Returns:
        Token: Access token and token type
        
    Raises:
        401: If email not found or password is incorrect
        401: If user account is inactive
    """
    # Find user by email
    user = db.query(User).filter(User.email == credentials.email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password
    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create JWT token
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.get("/me", response_model=UserOut)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user information.
    
    This is a protected endpoint that requires a valid JWT token.
    Extract the token from the Authorization header: Authorization: Bearer <token>
    
    Args:
        current_user: Current authenticated user (from JWT token)
        
    Returns:
        UserOut: Current user details
        
    Raises:
        401: If token is missing, invalid, or expired
    """
    return current_user
