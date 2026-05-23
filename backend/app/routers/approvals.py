"""
Approval workflow router.
Handles employee submissions and manager/admin approval actions.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, is_admin, is_employee, is_manager
from app.models import Approval, ApprovalHistory, User
from app.schemas import (
    ApprovalAction,
    ApprovalCreate,
    ApprovalHistoryOut,
    ApprovalOut,
)


router = APIRouter(prefix="/approvals", tags=["Approvals"])

VALID_APPROVAL_ACTIONS = {"approve", "reject", "hold"}


def get_approval_or_404(approval_id: int, db: Session) -> Approval:
    approval = db.query(Approval).filter(Approval.id == approval_id).first()
    if approval is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Approval not found",
        )
    return approval


def add_approval_history(
    db: Session,
    approval_id: int,
    user_id: int,
    action: str,
    comment: str | None = None,
) -> ApprovalHistory:
    history = ApprovalHistory(
        approval_id=approval_id,
        action_by_id=user_id,
        action=action,
        comment=comment,
    )
    db.add(history)
    return history


def ensure_can_view_approval(user: User, approval: Approval, db: Session) -> None:
    if is_admin(user):
        return

    if is_employee(user) and approval.requested_by_id == user.id:
        return

    if is_manager(user):
        if approval.current_level == "manager":
            return
        acted = (
            db.query(ApprovalHistory)
            .filter(
                ApprovalHistory.approval_id == approval.id,
                ApprovalHistory.action_by_id == user.id,
            )
            .first()
        )
        if acted is not None:
            return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have permission to perform this approval action",
    )


def validate_approval_action(action_data: ApprovalAction) -> str:
    action = action_data.action.strip().lower()
    if action not in VALID_APPROVAL_ACTIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid approval action",
        )

    if action == "reject" and not (action_data.comment or "").strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rejection requires a comment",
        )

    return action


@router.post("/", response_model=ApprovalOut, status_code=status.HTTP_201_CREATED)
def create_approval(
    approval_data: ApprovalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Submit a new approval request.
    """
    approval = Approval(
        title=approval_data.title,
        description=approval_data.description,
        requested_by_id=current_user.id,
        status="pending",
        current_level="manager",
    )
    db.add(approval)
    db.flush()

    add_approval_history(
        db=db,
        approval_id=approval.id,
        user_id=current_user.id,
        action="submitted",
        comment="Approval request submitted",
    )

    db.commit()
    db.refresh(approval)
    return approval


@router.get("/", response_model=list[ApprovalOut])
def list_approvals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List approvals based on the current user's role.
    """
    query = db.query(Approval)

    if is_admin(current_user):
        return query.order_by(Approval.created_at.desc(), Approval.id.desc()).all()

    if is_manager(current_user):
        acted_approval_ids = (
            select(ApprovalHistory.approval_id)
            .filter(ApprovalHistory.action_by_id == current_user.id)
        )
        return (
            query.filter(
                (Approval.current_level == "manager")
                | (Approval.id.in_(acted_approval_ids))
            )
            .order_by(Approval.created_at.desc(), Approval.id.desc())
            .all()
        )

    return (
        query.filter(Approval.requested_by_id == current_user.id)
        .order_by(Approval.created_at.desc(), Approval.id.desc())
        .all()
    )


@router.patch("/{approval_id}/action", response_model=ApprovalOut)
def act_on_approval(
    approval_id: int,
    action_data: ApprovalAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Approve, reject, or hold an approval request.
    """
    approval = get_approval_or_404(approval_id, db)
    action = validate_approval_action(action_data)
    comment = action_data.comment.strip() if action_data.comment else None

    if is_employee(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employees cannot approve or reject requests",
        )

    if approval.current_level == "completed":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this approval action",
        )

    if approval.current_level == "manager":
        if not is_manager(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only managers can act at manager approval level",
            )

        if action == "approve":
            approval.status = "manager_approved"
            approval.current_level = "admin"
        elif action == "reject":
            approval.status = "rejected"
            approval.current_level = "completed"
        else:
            approval.status = "hold"
            approval.current_level = "manager"

    elif approval.current_level == "admin":
        if not is_admin(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can act at admin approval level",
            )

        if action == "approve":
            approval.status = "admin_approved"
            approval.current_level = "completed"
        elif action == "reject":
            approval.status = "rejected"
            approval.current_level = "completed"
        else:
            approval.status = "hold"
            approval.current_level = "admin"

    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this approval action",
        )

    add_approval_history(
        db=db,
        approval_id=approval.id,
        user_id=current_user.id,
        action=action,
        comment=comment,
    )
    db.commit()
    db.refresh(approval)
    return approval


@router.get("/{approval_id}/history", response_model=list[ApprovalHistoryOut])
def get_approval_history(
    approval_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return approval audit history.
    """
    approval = get_approval_or_404(approval_id, db)
    ensure_can_view_approval(current_user, approval, db)

    return (
        db.query(ApprovalHistory)
        .filter(ApprovalHistory.approval_id == approval.id)
        .order_by(ApprovalHistory.created_at.desc(), ApprovalHistory.id.desc())
        .all()
    )
