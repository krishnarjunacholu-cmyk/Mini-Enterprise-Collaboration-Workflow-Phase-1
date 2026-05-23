"""
Dashboard analytics router.
Provides role-aware summary counts and recent activity.
"""

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, is_admin, is_employee, is_manager
from app.models import Approval, ApprovalHistory, Comment, Task, TaskActivity, User


router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

TASK_STATUSES = ["todo", "in_progress", "review", "done"]
TASK_PRIORITIES = ["low", "medium", "high"]
APPROVAL_STATUSES = ["pending", "manager_approved", "admin_approved", "rejected", "hold"]


def visible_task_ids_query(user: User):
    query = select(Task.id)

    if is_admin(user):
        return query

    if is_manager(user):
        return query.where(
            or_(Task.created_by_id == user.id, Task.assigned_to_id == user.id)
        )

    return query.where(Task.assigned_to_id == user.id)


def visible_approval_ids_query(user: User):
    query = select(Approval.id)

    if is_admin(user):
        return query

    if is_manager(user):
        acted_approval_ids = select(ApprovalHistory.approval_id).where(
            ApprovalHistory.action_by_id == user.id
        )
        return query.where(
            or_(
                Approval.current_level == "manager",
                Approval.id.in_(acted_approval_ids),
            )
        )

    return query.where(Approval.requested_by_id == user.id)


def count_grouped(db: Session, model, field, keys: list[str], id_query):
    rows = (
        db.query(field, func.count(model.id))
        .filter(model.id.in_(id_query))
        .group_by(field)
        .all()
    )
    counts = {key: 0 for key in keys}
    counts.update({key: count for key, count in rows})
    return counts


def task_distribution(db: Session, user: User):
    return count_grouped(db, Task, Task.status, TASK_STATUSES, visible_task_ids_query(user))


def priority_distribution(db: Session, user: User):
    return count_grouped(
        db,
        Task,
        Task.priority,
        TASK_PRIORITIES,
        visible_task_ids_query(user),
    )


def approval_distribution(db: Session, user: User):
    return count_grouped(
        db,
        Approval,
        Approval.status,
        APPROVAL_STATUSES,
        visible_approval_ids_query(user),
    )


def total_visible_comments(db: Session, user: User) -> int:
    query = db.query(func.count(Comment.id)).filter(
        Comment.task_id.in_(visible_task_ids_query(user))
    )
    if is_employee(user):
        query = query.filter(Comment.is_internal.is_(False))
    return query.scalar() or 0


@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return role-aware dashboard summary counts.
    """
    tasks = task_distribution(db, current_user)
    approvals = approval_distribution(db, current_user)

    return {
        "total_tasks": sum(tasks.values()),
        "todo_tasks": tasks["todo"],
        "in_progress_tasks": tasks["in_progress"],
        "review_tasks": tasks["review"],
        "completed_tasks": tasks["done"],
        "pending_approvals": approvals["pending"],
        "manager_approved": approvals["manager_approved"],
        "admin_approved": approvals["admin_approved"],
        "rejected_approvals": approvals["rejected"],
        "hold_approvals": approvals["hold"],
        "total_comments": total_visible_comments(db, current_user),
    }


@router.get("/task-distribution")
def get_task_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return task counts grouped by workflow status.
    """
    return task_distribution(db, current_user)


@router.get("/priority-distribution")
def get_priority_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return task counts grouped by priority.
    """
    return priority_distribution(db, current_user)


@router.get("/approval-summary")
def get_approval_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return approval counts grouped by status.
    """
    return approval_distribution(db, current_user)


@router.get("/recent-activity")
def get_recent_activity(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return recent task activity and approval history for the current user's scope.
    """
    safe_limit = min(max(limit, 1), 50)

    task_rows = (
        db.query(TaskActivity)
        .filter(TaskActivity.task_id.in_(visible_task_ids_query(current_user)))
        .order_by(TaskActivity.created_at.desc(), TaskActivity.id.desc())
        .limit(safe_limit)
        .all()
    )
    approval_rows = (
        db.query(ApprovalHistory)
        .filter(ApprovalHistory.approval_id.in_(visible_approval_ids_query(current_user)))
        .order_by(ApprovalHistory.created_at.desc(), ApprovalHistory.id.desc())
        .limit(safe_limit)
        .all()
    )

    items = [
        {
            "type": "task_activity",
            "message": row.details or row.action.replace("_", " ").title(),
            "user_id": row.user_id,
            "created_at": row.created_at,
        }
        for row in task_rows
    ]
    items.extend(
        {
            "type": "approval_history",
            "message": row.comment or f"Approval request {row.action}",
            "user_id": row.action_by_id,
            "created_at": row.created_at,
        }
        for row in approval_rows
    )

    def sort_key(item) -> datetime:
        return item["created_at"] or datetime.min

    return sorted(items, key=sort_key, reverse=True)[:safe_limit]
