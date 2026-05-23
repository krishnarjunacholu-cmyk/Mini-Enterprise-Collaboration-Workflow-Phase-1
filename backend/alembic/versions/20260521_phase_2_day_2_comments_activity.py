"""phase 2 day 2 comments activity

Revision ID: 20260521_comments
Revises: 20260520_kanban
Create Date: 2026-05-21 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "20260521_comments"
down_revision: Union[str, None] = "20260520_kanban"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def table_exists(table_name: str) -> bool:
    context = op.get_context()
    if context.as_sql:
        return False
    return inspect(op.get_bind()).has_table(table_name)


def upgrade() -> None:
    if not table_exists("comments"):
        op.create_table(
            "comments",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("task_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("is_internal", sa.Boolean(), nullable=False),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
            sa.ForeignKeyConstraint(["task_id"], ["tasks.id"]),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_comments_id"), "comments", ["id"], unique=False)

    if not table_exists("task_activity"):
        op.create_table(
            "task_activity",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("task_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("action", sa.String(length=100), nullable=False),
            sa.Column("details", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
            sa.ForeignKeyConstraint(["task_id"], ["tasks.id"]),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            op.f("ix_task_activity_id"),
            "task_activity",
            ["id"],
            unique=False,
        )


def downgrade() -> None:
    op.drop_index(op.f("ix_task_activity_id"), table_name="task_activity")
    op.drop_table("task_activity")
    op.drop_index(op.f("ix_comments_id"), table_name="comments")
    op.drop_table("comments")
