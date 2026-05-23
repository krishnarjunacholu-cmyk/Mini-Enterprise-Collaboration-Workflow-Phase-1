"""phase 2 day 3 approval workflow

Revision ID: 20260521_approvals
Revises: 20260521_comments
Create Date: 2026-05-21 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "20260521_approvals"
down_revision: Union[str, None] = "20260521_comments"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def table_exists(table_name: str) -> bool:
    context = op.get_context()
    if context.as_sql:
        return False
    return inspect(op.get_bind()).has_table(table_name)


def upgrade() -> None:
    if not table_exists("approvals"):
        op.create_table(
            "approvals",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("requested_by_id", sa.Integer(), nullable=False),
            sa.Column("status", sa.String(length=50), nullable=False),
            sa.Column("current_level", sa.String(length=50), nullable=False),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
            sa.ForeignKeyConstraint(["requested_by_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_approvals_id"), "approvals", ["id"], unique=False)

    if not table_exists("approval_history"):
        op.create_table(
            "approval_history",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("approval_id", sa.Integer(), nullable=False),
            sa.Column("action_by_id", sa.Integer(), nullable=False),
            sa.Column("action", sa.String(length=50), nullable=False),
            sa.Column("comment", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
            sa.ForeignKeyConstraint(["action_by_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["approval_id"], ["approvals.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            op.f("ix_approval_history_id"),
            "approval_history",
            ["id"],
            unique=False,
        )


def downgrade() -> None:
    op.drop_index(op.f("ix_approval_history_id"), table_name="approval_history")
    op.drop_table("approval_history")
    op.drop_index(op.f("ix_approvals_id"), table_name="approvals")
    op.drop_table("approvals")
