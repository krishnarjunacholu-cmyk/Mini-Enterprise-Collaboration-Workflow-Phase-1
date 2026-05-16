"""
Pydantic schemas for request/response validation and documentation.
Defines DTOs (Data Transfer Objects) for API endpoints.
"""

from datetime import datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# Allowed roles
ALLOWED_ROLES = Literal["admin", "manager", "employee"]


class TaskStatusEnum(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"


class TaskPriorityEnum(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class UserCreate(BaseModel):
    """
    Schema for user registration request.
    Validates input data for creating a new user.
    """
    name: str = Field(..., min_length=1, max_length=255, description="User's full name")
    email: EmailStr = Field(..., description="User's email address (must be unique)")
    password: str = Field(..., min_length=6, max_length=72, description="Password (6 to 72 characters)")
    role: ALLOWED_ROLES = Field(..., description="User role: admin, manager, or employee")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "John Doe",
                "email": "john@example.com",
                "password": "SecurePass123",
                "role": "employee",
            }
        }
    )


class UserLogin(BaseModel):
    """
    Schema for login request.
    Accepts email and password credentials.
    """
    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., description="User's password")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "john@example.com",
                "password": "SecurePass123",
            }
        }
    )


class UserOut(BaseModel):
    """
    Schema for user response.
    Returned from APIs (never includes password).
    """
    id: int
    name: str
    email: str
    role: str
    is_active: bool
    created_at: datetime
    
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "name": "John Doe",
                "email": "john@example.com",
                "role": "employee",
                "is_active": True,
                "created_at": "2024-01-15T10:30:00",
            }
        }
    )


class Token(BaseModel):
    """
    Schema for JWT token response.
    Returned after successful login or registration.
    """
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(..., description="Token type (always 'bearer')")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
            }
        }
    )


class TaskCreate(BaseModel):
    """
    Schema for creating a task.
    """
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    status: str = Field(default=TaskStatusEnum.TODO.value)
    priority: str = Field(default=TaskPriorityEnum.MEDIUM.value)
    due_date: datetime | None = None
    assigned_to_id: int | None = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title": "Prepare sprint report",
                "description": "Summarize team progress and blockers.",
                "status": "todo",
                "priority": "medium",
                "due_date": "2026-05-20T18:00:00",
                "assigned_to_id": 3,
            }
        }
    )


class TaskUpdate(BaseModel):
    """
    Schema for updating a task. All fields are optional.
    """
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    due_date: datetime | None = None
    assigned_to_id: int | None = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title": "Prepare final sprint report",
                "status": "in_progress",
                "priority": "high",
                "assigned_to_id": 3,
            }
        }
    )


class TaskAssign(BaseModel):
    """
    Schema for assigning a task to a user.
    """
    assigned_to_id: int

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "assigned_to_id": 3,
            }
        }
    )


class TaskOut(BaseModel):
    """
    Schema for task responses.
    """
    id: int
    title: str
    description: str | None
    status: str
    priority: str
    due_date: datetime | None
    created_by_id: int
    assigned_to_id: int | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
