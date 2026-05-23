"""
Task workflow helpers for Kanban status validation and grouping.
"""

from app.schemas import TaskStatusEnum


WORKFLOW_ERROR_MESSAGE = (
    "Invalid status transition. Task must follow "
    "TODO \u2192 IN PROGRESS \u2192 REVIEW \u2192 DONE workflow."
)

VALID_STATUSES = {status.value for status in TaskStatusEnum}
FORWARD_TRANSITIONS = {
    "todo": {"in_progress"},
    "in_progress": {"review"},
    "review": {"done"},
    "done": set(),
}
MANAGER_BACKWARD_TRANSITIONS = {
    "review": {"in_progress"},
    "in_progress": {"todo"},
}


def validate_status_transition(old_status: str, new_status: str, user_role: str) -> None:
    """
    Validate task workflow movement.

    Employees may only move tasks forward. Admins and managers can also move
    review back to in_progress and in_progress back to todo.
    """
    if old_status not in VALID_STATUSES or new_status not in VALID_STATUSES:
        raise ValueError("Invalid status value")

    if old_status == new_status:
        return

    if new_status in FORWARD_TRANSITIONS.get(old_status, set()):
        return

    if user_role in {"admin", "manager"} and new_status in MANAGER_BACKWARD_TRANSITIONS.get(
        old_status, set()
    ):
        return

    raise ValueError(WORKFLOW_ERROR_MESSAGE)


def group_tasks_by_status(tasks):
    """
    Return tasks grouped by Kanban status columns.
    """
    grouped = {status.value: [] for status in TaskStatusEnum}
    for task in tasks:
        grouped.setdefault(task.status, []).append(task)
    return {
        "todo": grouped.get("todo", []),
        "in_progress": grouped.get("in_progress", []),
        "review": grouped.get("review", []),
        "done": grouped.get("done", []),
    }
