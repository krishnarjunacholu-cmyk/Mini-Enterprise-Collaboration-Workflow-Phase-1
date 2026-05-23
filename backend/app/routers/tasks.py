"""
Task router.
Handles task CRUD, assignment, and role-based task visibility.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, is_admin, is_employee, is_manager
from app.models import Task, TaskStatusHistory, User
from app.schemas import (
    CommentCreate,
    CommentOut,
    KanbanBoardOut,
    TaskAssign,
    TaskActivityOut,
    TaskCreate,
    TaskOut,
    TaskPriorityEnum,
    TaskStatusHistoryOut,
    TaskStatusUpdate,
    TaskStatusEnum,
    TaskUpdate,
)
from app.services.comment_service import (
    create_comment,
    create_task_activity,
    get_task_activity,
    get_task_comments,
)
from app.services.workflow_service import (
    WORKFLOW_ERROR_MESSAGE,
    group_tasks_by_status,
    validate_status_transition,
)


router = APIRouter(prefix="/tasks", tags=["Tasks"])


VALID_STATUSES = {item.value for item in TaskStatusEnum}
VALID_PRIORITIES = {item.value for item in TaskPriorityEnum}


def validate_status(status_value: str | None) -> None:
    if status_value is not None and status_value not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status value",
        )


def validate_priority(priority_value: str | None) -> None:
    if priority_value is not None and priority_value not in VALID_PRIORITIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid priority. Allowed values are: low, medium, high",
        )


def get_task_or_404(task_id: int, db: Session) -> Task:
    task = db.query(Task).filter(Task.id == task_id).first()
    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    return task


def get_active_assigned_user_or_400(assigned_to_id: int, db: Session) -> User:
    user = (
        db.query(User)
        .filter(User.id == assigned_to_id, User.is_active.is_(True))
        .first()
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assigned user not found",
        )
    return user


def ensure_can_assign_to_user(current_user: User, assigned_user: User) -> None:
    if is_manager(current_user) and not is_employee(assigned_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Managers can assign tasks only to employees",
        )


def ensure_can_access_task(current_user: User, task: Task) -> None:
    if is_admin(current_user):
        return
    if is_manager(current_user) and (
        task.created_by_id == current_user.id or task.assigned_to_id == current_user.id
    ):
        return
    if is_employee(current_user) and task.assigned_to_id == current_user.id:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have permission to access this task",
    )


def ensure_can_update_task(current_user: User, task: Task, update_data: dict) -> None:
    ensure_can_access_task(current_user, task)
    if not is_employee(current_user):
        return

    disallowed_fields = set(update_data) - {"status"}
    if disallowed_fields:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employees can update only task status",
        )


def get_visible_tasks_query(current_user: User, db: Session):
    query = db.query(Task)

    if is_admin(current_user):
        return query

    if is_manager(current_user):
        return query.filter(
            or_(
                Task.created_by_id == current_user.id,
                Task.assigned_to_id == current_user.id,
            )
        )

    return query.filter(Task.assigned_to_id == current_user.id)


def apply_status_update(
    task: Task,
    new_status: str,
    comment: str | None,
    current_user: User,
    db: Session,
) -> None:
    validate_status(new_status)

    try:
        validate_status_transition(task.status, new_status, current_user.role)
    except ValueError as exc:
        error_message = str(exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Invalid status value"
                if error_message == "Invalid status value"
                else WORKFLOW_ERROR_MESSAGE
            ),
        ) from exc

    old_status = task.status
    task.status = new_status
    task.updated_by_id = current_user.id

    if old_status != new_status:
        db.add(
            TaskStatusHistory(
                task_id=task.id,
                old_status=old_status,
                new_status=new_status,
                changed_by_id=current_user.id,
                comment=comment,
            )
        )
        create_task_activity(
            db=db,
            task_id=task.id,
            user_id=current_user.id,
            action="status_changed",
            details=f"Status changed from {old_status} to {new_status}",
        )


@router.post("/", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    task_data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a task. Admins and managers can create tasks; employees cannot.
    """
    if is_employee(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employees cannot create tasks",
        )

    validate_status(task_data.status)
    validate_priority(task_data.priority)

    assigned_user = None
    if task_data.assigned_to_id is not None:
        assigned_user = get_active_assigned_user_or_400(task_data.assigned_to_id, db)
        ensure_can_assign_to_user(current_user, assigned_user)

    task = Task(
        title=task_data.title,
        description=task_data.description,
        status=task_data.status,
        priority=task_data.priority,
        due_date=task_data.due_date,
        created_by_id=current_user.id,
        assigned_to_id=assigned_user.id if assigned_user else None,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/", response_model=list[TaskOut])
def list_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List tasks using role-based visibility.
    """
    return get_visible_tasks_query(current_user, db).all()


@router.get("/kanban", response_model=KanbanBoardOut)
def get_kanban_board(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return tasks grouped by Kanban workflow status using role-based visibility.
    """
    tasks = get_visible_tasks_query(current_user, db).all()
    return group_tasks_by_status(tasks)


@router.get("/{task_id}", response_model=TaskOut)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get task details if the current user has access.
    """
    task = get_task_or_404(task_id, db)
    ensure_can_access_task(current_user, task)
    return task


@router.put("/{task_id}", response_model=TaskOut)
def update_task(
    task_id: int,
    task_data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update task details using role-based rules.
    """
    task = get_task_or_404(task_id, db)
    update_data = task_data.model_dump(exclude_unset=True)
    ensure_can_update_task(current_user, task, update_data)

    validate_status(update_data.get("status"))
    validate_priority(update_data.get("priority"))

    if "assigned_to_id" in update_data and update_data["assigned_to_id"] is not None:
        assigned_user = get_active_assigned_user_or_400(
            update_data["assigned_to_id"], db
        )
        ensure_can_assign_to_user(current_user, assigned_user)

    status_value = update_data.pop("status", None)
    if status_value is not None:
        apply_status_update(
            task=task,
            new_status=status_value,
            comment=None,
            current_user=current_user,
            db=db,
        )

    for field, value in update_data.items():
        setattr(task, field, value)

    if update_data:
        create_task_activity(
            db=db,
            task_id=task.id,
            user_id=current_user.id,
            action="task_updated",
            details="Task details updated",
        )

    db.commit()
    db.refresh(task)
    return task


@router.patch("/{task_id}/status", response_model=TaskOut)
def update_task_status(
    task_id: int,
    status_data: TaskStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update task status using Kanban workflow validation.
    """
    task = get_task_or_404(task_id, db)
    ensure_can_access_task(current_user, task)

    apply_status_update(
        task=task,
        new_status=status_data.status,
        comment=status_data.comment,
        current_user=current_user,
        db=db,
    )

    db.commit()
    db.refresh(task)
    return task


@router.get("/{task_id}/status-history", response_model=list[TaskStatusHistoryOut])
def get_task_status_history(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return task status history if the current user has access to the task.
    """
    task = get_task_or_404(task_id, db)
    ensure_can_access_task(current_user, task)

    return (
        db.query(TaskStatusHistory)
        .filter(TaskStatusHistory.task_id == task.id)
        .order_by(TaskStatusHistory.created_at.desc(), TaskStatusHistory.id.desc())
        .all()
    )


@router.post(
    "/{task_id}/comments",
    response_model=CommentOut,
    status_code=status.HTTP_201_CREATED,
)
def add_task_comment(
    task_id: int,
    comment_data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Add a public comment or internal note to a task.
    """
    task = get_task_or_404(task_id, db)
    ensure_can_access_task(current_user, task)

    if not comment_data.content.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Comment content cannot be empty",
        )

    if is_employee(current_user) and comment_data.is_internal:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employees cannot create internal comments",
        )

    comment = create_comment(db, task, current_user, comment_data)
    db.commit()
    db.refresh(comment)
    return comment


@router.get("/{task_id}/comments", response_model=list[CommentOut])
def list_task_comments(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return task comments visible to the current user.
    """
    task = get_task_or_404(task_id, db)
    ensure_can_access_task(current_user, task)
    return get_task_comments(db, task, current_user)


@router.get("/{task_id}/activity", response_model=list[TaskActivityOut])
def list_task_activity(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return task activity history visible to the current user.
    """
    task = get_task_or_404(task_id, db)
    ensure_can_access_task(current_user, task)
    return get_task_activity(db, task, current_user)


@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a task using role-based rules.
    """
    task = get_task_or_404(task_id, db)

    if is_employee(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employees cannot delete tasks",
        )

    if is_manager(current_user) and task.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this task",
        )

    db.delete(task)
    db.commit()
    return {"message": "Task deleted successfully"}


@router.patch("/{task_id}/assign", response_model=TaskOut)
def assign_task(
    task_id: int,
    assign_data: TaskAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Assign a task to an active user.
    """
    if is_employee(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employees cannot assign tasks",
        )

    task = get_task_or_404(task_id, db)

    if is_manager(current_user) and task.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this task",
        )

    assigned_user = get_active_assigned_user_or_400(assign_data.assigned_to_id, db)
    ensure_can_assign_to_user(current_user, assigned_user)

    task.assigned_to_id = assigned_user.id
    create_task_activity(
        db=db,
        task_id=task.id,
        user_id=current_user.id,
        action="task_assigned",
        details=f"Task assigned to user ID {assigned_user.id}",
    )
    db.commit()
    db.refresh(task)
    return task
