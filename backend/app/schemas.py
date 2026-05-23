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
    REVIEW = "review"
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
    updated_by_id: int | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TaskStatusUpdate(BaseModel):
    """
    Schema for workflow status updates.
    """
    status: str = Field(..., description="New workflow status")
    comment: str | None = Field(default=None, description="Optional status note")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "status": "in_progress",
                "comment": "Started working on this task",
            }
        }
    )


class TaskStatusHistoryOut(BaseModel):
    """
    Schema for task status history responses.
    """
    id: int
    task_id: int
    old_status: str
    new_status: str
    changed_by_id: int
    comment: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class KanbanTaskOut(TaskOut):
    """
    Task output shape used by Kanban board responses.
    """
    pass


class KanbanBoardOut(BaseModel):
    """
    Tasks grouped by Kanban workflow status.
    """
    todo: list[KanbanTaskOut]
    in_progress: list[KanbanTaskOut]
    review: list[KanbanTaskOut]
    done: list[KanbanTaskOut]

    model_config = ConfigDict(from_attributes=True)


class CommentCreate(BaseModel):
    """
    Schema for creating task comments and internal notes.
    """
    content: str = Field(..., min_length=1, description="Comment text")
    is_internal: bool = Field(default=False, description="Internal note flag")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "content": "Please update the progress before evening.",
                "is_internal": False,
            }
        }
    )


class CommentOut(BaseModel):
    """
    Schema for task comment responses.
    """
    id: int
    task_id: int
    user_id: int
    content: str
    is_internal: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TaskActivityOut(BaseModel):
    """
    Schema for task activity log responses.
    """
    id: int
    task_id: int
    user_id: int
    action: str
    details: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ApprovalCreate(BaseModel):
    """
    Schema for creating approval requests.
    """
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title": "Request for task completion approval",
                "description": "Please review and approve the completed work.",
            }
        }
    )


class ApprovalAction(BaseModel):
    """
    Schema for manager/admin approval actions.
    """
    action: str = Field(..., description="approve, reject, or hold")
    comment: str | None = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "action": "approve",
                "comment": "Approved by manager",
            }
        }
    )


class ApprovalOut(BaseModel):
    """
    Schema for approval request responses.
    """
    id: int
    title: str
    description: str | None
    requested_by_id: int
    status: str
    current_level: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ApprovalHistoryOut(BaseModel):
    """
    Schema for approval history responses.
    """
    id: int
    approval_id: int
    action_by_id: int
    action: str
    comment: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
