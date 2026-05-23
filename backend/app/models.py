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
    tasks_updated = relationship(
        "Task",
        back_populates="updated_by",
        foreign_keys="Task.updated_by_id",
    )
    status_changes = relationship(
        "TaskStatusHistory",
        back_populates="changed_by",
        foreign_keys="TaskStatusHistory.changed_by_id",
    )
    comments = relationship(
        "Comment",
        back_populates="user",
        foreign_keys="Comment.user_id",
    )
    task_activities = relationship(
        "TaskActivity",
        back_populates="user",
        foreign_keys="TaskActivity.user_id",
    )
    approvals_requested = relationship(
        "Approval",
        back_populates="requested_by",
        foreign_keys="Approval.requested_by_id",
    )
    approval_actions = relationship(
        "ApprovalHistory",
        back_populates="action_by",
        foreign_keys="ApprovalHistory.action_by_id",
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
    updated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
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
    updated_by = relationship(
        "User",
        back_populates="tasks_updated",
        foreign_keys=[updated_by_id],
    )
    status_history = relationship(
        "TaskStatusHistory",
        back_populates="task",
        cascade="all, delete-orphan",
    )
    comments = relationship(
        "Comment",
        back_populates="task",
        cascade="all, delete-orphan",
    )
    activities = relationship(
        "TaskActivity",
        back_populates="task",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<Task(id={self.id}, title={self.title}, status={self.status})>"


class TaskStatusHistory(Base):
    """
    Status change audit trail for task workflow transitions.
    """
    __tablename__ = "task_status_history"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    old_status = Column(String(50), nullable=False)
    new_status = Column(String(50), nullable=False)
    changed_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    task = relationship("Task", back_populates="status_history")
    changed_by = relationship(
        "User",
        back_populates="status_changes",
        foreign_keys=[changed_by_id],
    )

    def __repr__(self):
        return (
            f"<TaskStatusHistory(id={self.id}, task_id={self.task_id}, "
            f"old_status={self.old_status}, new_status={self.new_status})>"
        )


class Comment(Base):
    """
    Task-level public comments and internal notes.
    """
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    task = relationship("Task", back_populates="comments")
    user = relationship(
        "User",
        back_populates="comments",
        foreign_keys=[user_id],
    )

    def __repr__(self):
        return f"<Comment(id={self.id}, task_id={self.task_id}, user_id={self.user_id})>"


class TaskActivity(Base):
    """
    Activity feed for task collaboration events.
    """
    __tablename__ = "task_activity"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(100), nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    task = relationship("Task", back_populates="activities")
    user = relationship(
        "User",
        back_populates="task_activities",
        foreign_keys=[user_id],
    )

    def __repr__(self):
        return f"<TaskActivity(id={self.id}, task_id={self.task_id}, action={self.action})>"


class Approval(Base):
    """
    Enterprise approval request with manager and admin review levels.
    """
    __tablename__ = "approvals"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    requested_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(50), nullable=False, default="pending")
    current_level = Column(String(50), nullable=False, default="manager")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    requested_by = relationship(
        "User",
        back_populates="approvals_requested",
        foreign_keys=[requested_by_id],
    )
    history = relationship(
        "ApprovalHistory",
        back_populates="approval",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return (
            f"<Approval(id={self.id}, status={self.status}, "
            f"current_level={self.current_level})>"
        )


class ApprovalHistory(Base):
    """
    Audit trail for approval submissions and actions.
    """
    __tablename__ = "approval_history"

    id = Column(Integer, primary_key=True, index=True)
    approval_id = Column(Integer, ForeignKey("approvals.id"), nullable=False)
    action_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(50), nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    approval = relationship("Approval", back_populates="history")
    action_by = relationship(
        "User",
        back_populates="approval_actions",
        foreign_keys=[action_by_id],
    )

    def __repr__(self):
        return (
            f"<ApprovalHistory(id={self.id}, approval_id={self.approval_id}, "
            f"action={self.action})>"
        )
