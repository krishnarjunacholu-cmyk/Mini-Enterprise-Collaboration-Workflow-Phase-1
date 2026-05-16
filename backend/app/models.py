"""
SQLAlchemy ORM models for database tables.
Defines users and tasks for the collaboration workflow.
"""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    """
    User model representing users in the system.
    
    Fields:
        id: Unique identifier (primary key)
        name: User's full name
        email: User's email (unique, indexed for fast lookups)
        hashed_password: Bcrypt hashed password (never store plain text)
        role: User's role (admin, manager, employee)
        is_active: Whether the user account is active
        created_at: Account creation timestamp
    updated_at: Last update timestamp
    """
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # admin, manager, employee
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    tasks_created = relationship(
        "Task",
        back_populates="created_by",
        foreign_keys="Task.created_by_id",
        cascade="all, delete-orphan",
    )
    tasks_assigned = relationship(
        "Task",
        back_populates="assigned_to",
        foreign_keys="Task.assigned_to_id",
    )
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"


class Task(Base):
    """
    Task model representing work items created and assigned by users.
    """
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="todo")
    priority = Column(String(50), nullable=False, default="medium")
    due_date = Column(DateTime, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    created_by = relationship(
        "User",
        back_populates="tasks_created",
        foreign_keys=[created_by_id],
    )
    assigned_to = relationship(
        "User",
        back_populates="tasks_assigned",
        foreign_keys=[assigned_to_id],
    )

    def __repr__(self):
        return f"<Task(id={self.id}, title={self.title}, status={self.status})>"
