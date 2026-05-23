"""phase 2 day 1 kanban workflow

Revision ID: 20260520_kanban
Revises:
Create Date: 2026-05-20 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260520_kanban"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    dialect_name = op.get_context().dialect.name

    op.add_column(
        "tasks",
        sa.Column("updated_by_id", sa.Integer(), nullable=True),
    )
    if dialect_name != "sqlite":
        op.create_foreign_key(
            "fk_tasks_updated_by_id_users",
            "tasks",
            "users",
            ["updated_by_id"],
            ["id"],
        )
    op.create_table(
        "task_status_history",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("task_id", sa.Integer(), nullable=False),
        sa.Column("old_status", sa.String(length=50), nullable=False),
        sa.Column("new_status", sa.String(length=50), nullable=False),
        sa.Column("changed_by_id", sa.Integer(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["changed_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_task_status_history_id"),
        "task_status_history",
        ["id"],
        unique=False,
    )


def downgrade() -> None:
    dialect_name = op.get_context().dialect.name

    op.drop_index(op.f("ix_task_status_history_id"), table_name="task_status_history")
    op.drop_table("task_status_history")
    if dialect_name != "sqlite":
        op.drop_constraint("fk_tasks_updated_by_id_users", "tasks", type_="foreignkey")
    op.drop_column("tasks", "updated_by_id")
