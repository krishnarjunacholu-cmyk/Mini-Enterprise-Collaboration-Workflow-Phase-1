"""
Task comment and activity helpers.
"""

from sqlalchemy.orm import Session

from app.models import Comment, Task, TaskActivity, User
from app.schemas import CommentCreate


def can_access_task(user: User, task: Task) -> bool:
    """
    Return whether a user can access a task.
    """
    if user.role == "admin":
        return True
    if user.role == "manager":
        return task.created_by_id == user.id or task.assigned_to_id == user.id
    return task.assigned_to_id == user.id


def create_task_activity(
    db: Session,
    task_id: int,
    user_id: int,
    action: str,
    details: str | None = None,
) -> TaskActivity:
    activity = TaskActivity(
        task_id=task_id,
        user_id=user_id,
        action=action,
        details=details,
    )
    db.add(activity)
    return activity


def create_comment(
    db: Session,
    task: Task,
    user: User,
    comment_data: CommentCreate,
) -> Comment:
    comment = Comment(
        task_id=task.id,
        user_id=user.id,
        content=comment_data.content.strip(),
        is_internal=comment_data.is_internal,
    )
    db.add(comment)

    action = "internal_note_added" if comment.is_internal else "comment_added"
    details = "Internal note added" if comment.is_internal else "Comment added"
    create_task_activity(db, task.id, user.id, action, details)

    return comment


def get_task_comments(db: Session, task: Task, user: User) -> list[Comment]:
    query = db.query(Comment).filter(Comment.task_id == task.id)
    if user.role == "employee":
        query = query.filter(Comment.is_internal.is_(False))
    return query.order_by(Comment.created_at.asc(), Comment.id.asc()).all()


def get_task_activity(db: Session, task: Task, user: User) -> list[TaskActivity]:
    return (
        db.query(TaskActivity)
        .filter(TaskActivity.task_id == task.id)
        .order_by(TaskActivity.created_at.desc(), TaskActivity.id.desc())
        .all()
    )
