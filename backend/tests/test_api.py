from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app


engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def setup_function():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def register_user(email: str, role: str = "employee"):
    return client.post(
        "/auth/register",
        json={
            "name": "Test User",
            "email": email,
            "password": "SecurePass123",
            "role": role,
        },
    )


def login_user(email: str):
    return client.post(
        "/auth/login",
        json={"email": email, "password": "SecurePass123"},
    )


def auth_headers(email: str):
    response = login_user(email)
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def create_task(headers: dict, assigned_to_id: int | None = None):
    payload = {
        "title": "Test Task",
        "description": "Task created by automated tests.",
        "status": "todo",
        "priority": "medium",
    }
    if assigned_to_id is not None:
        payload["assigned_to_id"] = assigned_to_id
    return client.post("/tasks/", json=payload, headers=headers)


def test_root_and_health_endpoints():
    assert client.get("/").status_code == 200
    assert client.get("/health").json()["status"] == "healthy"


def test_register_login_and_current_user_flow():
    register_response = register_user("john@example.com")
    assert register_response.status_code == 201
    assert register_response.json()["email"] == "john@example.com"
    assert "password" not in register_response.json()

    login_response = login_user("john@example.com")
    assert login_response.status_code == 200
    assert login_response.json()["token_type"] == "bearer"

    me_response = client.get("/auth/me", headers=auth_headers("john@example.com"))
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "john@example.com"


def test_register_rejects_duplicate_email_and_bad_role():
    assert register_user("dupe@example.com").status_code == 201
    assert register_user("dupe@example.com").status_code == 400

    bad_role = client.post(
        "/auth/register",
        json={
            "name": "Bad Role",
            "email": "badrole@example.com",
            "password": "SecurePass123",
            "role": "owner",
        },
    )
    assert bad_role.status_code == 422


def test_login_rejects_wrong_password():
    assert register_user("wrong@example.com").status_code == 201
    response = client.post(
        "/auth/login",
        json={"email": "wrong@example.com", "password": "WrongPass123"},
    )
    assert response.status_code == 401


def test_protected_user_routes_and_admin_permission():
    assert register_user("admin@example.com", role="admin").status_code == 201
    assert register_user("employee@example.com").status_code == 201

    missing_token = client.get("/auth/me")
    assert missing_token.status_code == 401

    admin_headers = auth_headers("admin@example.com")
    employee_headers = auth_headers("employee@example.com")

    user_response = client.get("/users/1", headers=admin_headers)
    assert user_response.status_code == 200

    not_found = client.get("/users/999", headers=admin_headers)
    assert not_found.status_code == 404

    forbidden = client.get("/users/", headers=employee_headers)
    assert forbidden.status_code == 403

    users = client.get("/users/", headers=admin_headers)
    assert users.status_code == 200
    assert len(users.json()) == 2


def test_malformed_json_returns_validation_error():
    response = client.post(
        "/auth/register",
        content='{"name":"Broken" "email":"broken@example.com"}',
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 422
    assert response.json()["detail"][0]["type"] == "json_invalid"


def test_admin_task_crud_flow():
    admin = register_user("task-admin@example.com", role="admin").json()
    employee = register_user("task-employee@example.com").json()
    headers = auth_headers("task-admin@example.com")

    created = create_task(headers, assigned_to_id=employee["id"])
    assert created.status_code == 201
    task_id = created.json()["id"]
    assert created.json()["created_by_id"] == admin["id"]

    listed = client.get("/tasks/", headers=headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    fetched = client.get(f"/tasks/{task_id}", headers=headers)
    assert fetched.status_code == 200

    updated = client.put(
        f"/tasks/{task_id}",
        json={"status": "in_progress", "priority": "high"},
        headers=headers,
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "in_progress"
    assert updated.json()["priority"] == "high"

    deleted = client.delete(f"/tasks/{task_id}", headers=headers)
    assert deleted.status_code == 200
    assert deleted.json()["message"] == "Task deleted successfully"


def test_manager_task_permissions_and_assignment_limits():
    manager = register_user("task-manager@example.com", role="manager").json()
    employee = register_user("task-employee2@example.com").json()
    admin = register_user("task-admin2@example.com", role="admin").json()
    headers = auth_headers("task-manager@example.com")

    created = create_task(headers)
    assert created.status_code == 201
    task_id = created.json()["id"]
    assert created.json()["created_by_id"] == manager["id"]

    assigned = client.patch(
        f"/tasks/{task_id}/assign",
        json={"assigned_to_id": employee["id"]},
        headers=headers,
    )
    assert assigned.status_code == 200
    assert assigned.json()["assigned_to_id"] == employee["id"]

    assign_admin = client.patch(
        f"/tasks/{task_id}/assign",
        json={"assigned_to_id": admin["id"]},
        headers=headers,
    )
    assert assign_admin.status_code == 403
    assert assign_admin.json()["detail"] == "Managers can assign tasks only to employees"

    listed = client.get("/tasks/", headers=headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    deleted = client.delete(f"/tasks/{task_id}", headers=headers)
    assert deleted.status_code == 200


def test_employee_task_permissions():
    register_user("task-manager2@example.com", role="manager")
    employee = register_user("task-employee3@example.com").json()
    manager_headers = auth_headers("task-manager2@example.com")
    employee_headers = auth_headers("task-employee3@example.com")

    created = create_task(manager_headers, assigned_to_id=employee["id"])
    assert created.status_code == 201
    task_id = created.json()["id"]

    listed = client.get("/tasks/", headers=employee_headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    fetched = client.get(f"/tasks/{task_id}", headers=employee_headers)
    assert fetched.status_code == 200

    invalid_status_update = client.put(
        f"/tasks/{task_id}",
        json={"status": "done"},
        headers=employee_headers,
    )
    assert invalid_status_update.status_code == 400

    status_update = client.patch(
        f"/tasks/{task_id}/status",
        json={"status": "in_progress", "comment": "Started work"},
        headers=employee_headers,
    )
    assert status_update.status_code == 200
    assert status_update.json()["status"] == "in_progress"
    assert status_update.json()["updated_by_id"] == employee["id"]

    history = client.get(f"/tasks/{task_id}/status-history", headers=employee_headers)
    assert history.status_code == 200
    assert history.json()[0]["old_status"] == "todo"
    assert history.json()[0]["new_status"] == "in_progress"
    assert history.json()[0]["comment"] == "Started work"

    title_update = client.put(
        f"/tasks/{task_id}",
        json={"title": "Employees cannot rename"},
        headers=employee_headers,
    )
    assert title_update.status_code == 403

    create_attempt = create_task(employee_headers)
    assert create_attempt.status_code == 403
    assert create_attempt.json()["detail"] == "Employees cannot create tasks"

    assign_attempt = client.patch(
        f"/tasks/{task_id}/assign",
        json={"assigned_to_id": employee["id"]},
        headers=employee_headers,
    )
    assert assign_attempt.status_code == 403
    assert assign_attempt.json()["detail"] == "Employees cannot assign tasks"

    delete_attempt = client.delete(f"/tasks/{task_id}", headers=employee_headers)
    assert delete_attempt.status_code == 403
    assert delete_attempt.json()["detail"] == "Employees cannot delete tasks"


def test_task_validation_errors():
    register_user("task-admin3@example.com", role="admin")
    headers = auth_headers("task-admin3@example.com")

    invalid_status = client.post(
        "/tasks/",
        json={"title": "Bad status", "status": "blocked"},
        headers=headers,
    )
    assert invalid_status.status_code == 400

    invalid_priority = client.post(
        "/tasks/",
        json={"title": "Bad priority", "priority": "urgent"},
        headers=headers,
    )
    assert invalid_priority.status_code == 400

    missing_user = client.post(
        "/tasks/",
        json={"title": "Missing user", "assigned_to_id": 999},
        headers=headers,
    )
    assert missing_user.status_code == 400
    assert missing_user.json()["detail"] == "Assigned user not found"


def test_kanban_board_and_status_workflow_rules():
    admin = register_user("kanban-admin@example.com", role="admin").json()
    manager = register_user("kanban-manager@example.com", role="manager").json()
    employee = register_user("kanban-employee@example.com").json()
    other_employee = register_user("kanban-other@example.com").json()

    admin_headers = auth_headers("kanban-admin@example.com")
    manager_headers = auth_headers("kanban-manager@example.com")
    employee_headers = auth_headers("kanban-employee@example.com")
    other_employee_headers = auth_headers("kanban-other@example.com")

    first_task = create_task(admin_headers, assigned_to_id=employee["id"]).json()
    manager_task = create_task(manager_headers, assigned_to_id=employee["id"]).json()

    board = client.get("/tasks/kanban", headers=admin_headers)
    assert board.status_code == 200
    assert set(board.json()) == {"todo", "in_progress", "review", "done"}
    assert len(board.json()["todo"]) == 2

    invalid = client.patch(
        f"/tasks/{first_task['id']}/status",
        json={"status": "done"},
        headers=admin_headers,
    )
    assert invalid.status_code == 400
    assert (
        invalid.json()["detail"]
        == "Invalid status transition. Task must follow TODO \u2192 IN PROGRESS \u2192 REVIEW \u2192 DONE workflow."
    )

    to_progress = client.patch(
        f"/tasks/{first_task['id']}/status",
        json={"status": "in_progress", "comment": "Started"},
        headers=admin_headers,
    )
    assert to_progress.status_code == 200
    assert to_progress.json()["updated_by_id"] == admin["id"]

    to_review = client.patch(
        f"/tasks/{first_task['id']}/status",
        json={"status": "review"},
        headers=admin_headers,
    )
    assert to_review.status_code == 200

    to_done = client.patch(
        f"/tasks/{first_task['id']}/status",
        json={"status": "done"},
        headers=admin_headers,
    )
    assert to_done.status_code == 200

    history = client.get(f"/tasks/{first_task['id']}/status-history", headers=admin_headers)
    assert history.status_code == 200
    assert [item["new_status"] for item in reversed(history.json())] == [
        "in_progress",
        "review",
        "done",
    ]

    forbidden = client.patch(
        f"/tasks/{manager_task['id']}/status",
        json={"status": "in_progress"},
        headers=other_employee_headers,
    )
    assert forbidden.status_code == 403

    manager_board = client.get("/tasks/kanban", headers=manager_headers)
    assert manager_board.status_code == 200
    manager_task_ids = [
        task["id"]
        for tasks in manager_board.json().values()
        for task in tasks
    ]
    assert manager_task["id"] in manager_task_ids
    assert first_task["id"] not in manager_task_ids


def test_comments_and_activity_role_rules():
    admin = register_user("comments-admin@example.com", role="admin").json()
    manager = register_user("comments-manager@example.com", role="manager").json()
    employee = register_user("comments-employee@example.com").json()
    other_employee = register_user("comments-other@example.com").json()

    admin_headers = auth_headers("comments-admin@example.com")
    manager_headers = auth_headers("comments-manager@example.com")
    employee_headers = auth_headers("comments-employee@example.com")
    other_employee_headers = auth_headers("comments-other@example.com")

    admin_task = create_task(admin_headers, assigned_to_id=employee["id"]).json()
    manager_task = create_task(manager_headers, assigned_to_id=employee["id"]).json()

    empty_comment = client.post(
        f"/tasks/{admin_task['id']}/comments",
        json={"content": "   ", "is_internal": False},
        headers=admin_headers,
    )
    assert empty_comment.status_code == 400
    assert empty_comment.json()["detail"] == "Comment content cannot be empty"

    public_comment = client.post(
        f"/tasks/{admin_task['id']}/comments",
        json={"content": "Public admin comment", "is_internal": False},
        headers=admin_headers,
    )
    assert public_comment.status_code == 201
    assert public_comment.json()["user_id"] == admin["id"]
    assert public_comment.json()["is_internal"] is False

    internal_comment = client.post(
        f"/tasks/{admin_task['id']}/comments",
        json={"content": "Internal admin note", "is_internal": True},
        headers=admin_headers,
    )
    assert internal_comment.status_code == 201
    assert internal_comment.json()["is_internal"] is True

    admin_comments = client.get(
        f"/tasks/{admin_task['id']}/comments",
        headers=admin_headers,
    )
    assert admin_comments.status_code == 200
    assert len(admin_comments.json()) == 2

    employee_comments = client.get(
        f"/tasks/{admin_task['id']}/comments",
        headers=employee_headers,
    )
    assert employee_comments.status_code == 200
    assert len(employee_comments.json()) == 1
    assert employee_comments.json()[0]["is_internal"] is False

    employee_internal = client.post(
        f"/tasks/{admin_task['id']}/comments",
        json={"content": "Employee internal note", "is_internal": True},
        headers=employee_headers,
    )
    assert employee_internal.status_code == 403
    assert employee_internal.json()["detail"] == "Employees cannot create internal comments"

    forbidden = client.post(
        f"/tasks/{admin_task['id']}/comments",
        json={"content": "No access", "is_internal": False},
        headers=other_employee_headers,
    )
    assert forbidden.status_code == 403
    assert forbidden.json()["detail"] == "You do not have permission to access this task"

    manager_public = client.post(
        f"/tasks/{manager_task['id']}/comments",
        json={"content": "Manager public comment", "is_internal": False},
        headers=manager_headers,
    )
    assert manager_public.status_code == 201

    manager_internal = client.post(
        f"/tasks/{manager_task['id']}/comments",
        json={"content": "Manager internal note", "is_internal": True},
        headers=manager_headers,
    )
    assert manager_internal.status_code == 201

    manager_forbidden = client.post(
        f"/tasks/{admin_task['id']}/comments",
        json={"content": "Manager has no access here", "is_internal": False},
        headers=manager_headers,
    )
    assert manager_forbidden.status_code == 403

    activity = client.get(
        f"/tasks/{admin_task['id']}/activity",
        headers=admin_headers,
    )
    assert activity.status_code == 200
    actions = [item["action"] for item in activity.json()]
    assert "comment_added" in actions
    assert "internal_note_added" in actions

    missing_task = client.post(
        "/tasks/999/comments",
        json={"content": "Missing task", "is_internal": False},
        headers=admin_headers,
    )
    assert missing_task.status_code == 404
    assert missing_task.json()["detail"] == "Task not found"


def test_day_2_routes_are_in_openapi():
    schema = client.get("/openapi.json").json()
    assert "/tasks/{task_id}/comments" in schema["paths"]
    assert "/tasks/{task_id}/activity" in schema["paths"]


def create_approval(headers: dict, title: str = "Test Approval"):
    return client.post(
        "/approvals/",
        json={
            "title": title,
            "description": "Approval request created by automated tests.",
        },
        headers=headers,
    )


def test_approval_workflow_employee_manager_admin_flow():
    employee = register_user("approval-employee@example.com").json()
    manager = register_user("approval-manager@example.com", role="manager").json()
    admin = register_user("approval-admin@example.com", role="admin").json()

    employee_headers = auth_headers("approval-employee@example.com")
    manager_headers = auth_headers("approval-manager@example.com")
    admin_headers = auth_headers("approval-admin@example.com")

    created = create_approval(employee_headers)
    assert created.status_code == 201
    approval_id = created.json()["id"]
    assert created.json()["requested_by_id"] == employee["id"]
    assert created.json()["status"] == "pending"
    assert created.json()["current_level"] == "manager"

    employee_list = client.get("/approvals/", headers=employee_headers)
    assert employee_list.status_code == 200
    assert [item["id"] for item in employee_list.json()] == [approval_id]

    employee_action = client.patch(
        f"/approvals/{approval_id}/action",
        json={"action": "approve", "comment": "Not allowed"},
        headers=employee_headers,
    )
    assert employee_action.status_code == 403
    assert employee_action.json()["detail"] == "Employees cannot approve or reject requests"

    manager_list = client.get("/approvals/", headers=manager_headers)
    assert manager_list.status_code == 200
    assert approval_id in [item["id"] for item in manager_list.json()]

    manager_approved = client.patch(
        f"/approvals/{approval_id}/action",
        json={"action": "approve", "comment": "Approved by manager"},
        headers=manager_headers,
    )
    assert manager_approved.status_code == 200
    assert manager_approved.json()["status"] == "manager_approved"
    assert manager_approved.json()["current_level"] == "admin"

    manager_second_action = client.patch(
        f"/approvals/{approval_id}/action",
        json={"action": "hold", "comment": "Trying admin level"},
        headers=manager_headers,
    )
    assert manager_second_action.status_code == 403
    assert manager_second_action.json()["detail"] == "Only admins can act at admin approval level"

    admin_final = client.patch(
        f"/approvals/{approval_id}/action",
        json={"action": "approve", "comment": "Final approval"},
        headers=admin_headers,
    )
    assert admin_final.status_code == 200
    assert admin_final.json()["status"] == "admin_approved"
    assert admin_final.json()["current_level"] == "completed"

    history = client.get(f"/approvals/{approval_id}/history", headers=admin_headers)
    assert history.status_code == 200
    actions = [item["action"] for item in history.json()]
    assert "submitted" in actions
    assert "approve" in actions

    admin_list = client.get("/approvals/", headers=admin_headers)
    assert admin_list.status_code == 200
    assert approval_id in [item["id"] for item in admin_list.json()]


def test_approval_reject_hold_and_access_rules():
    register_user("approval-employee2@example.com")
    register_user("approval-other-employee@example.com")
    register_user("approval-manager2@example.com", role="manager")
    register_user("approval-admin2@example.com", role="admin")

    employee_headers = auth_headers("approval-employee2@example.com")
    other_employee_headers = auth_headers("approval-other-employee@example.com")
    manager_headers = auth_headers("approval-manager2@example.com")
    admin_headers = auth_headers("approval-admin2@example.com")

    approval = create_approval(employee_headers, "Reject at manager").json()
    approval_id = approval["id"]

    invalid_action = client.patch(
        f"/approvals/{approval_id}/action",
        json={"action": "send_back", "comment": "Bad action"},
        headers=manager_headers,
    )
    assert invalid_action.status_code == 400
    assert invalid_action.json()["detail"] == "Invalid approval action"

    reject_without_comment = client.patch(
        f"/approvals/{approval_id}/action",
        json={"action": "reject"},
        headers=manager_headers,
    )
    assert reject_without_comment.status_code == 400
    assert reject_without_comment.json()["detail"] == "Rejection requires a comment"

    held = client.patch(
        f"/approvals/{approval_id}/action",
        json={"action": "hold", "comment": "Need more clarification"},
        headers=manager_headers,
    )
    assert held.status_code == 200
    assert held.json()["status"] == "hold"
    assert held.json()["current_level"] == "manager"

    rejected = client.patch(
        f"/approvals/{approval_id}/action",
        json={"action": "reject", "comment": "Details are incomplete"},
        headers=manager_headers,
    )
    assert rejected.status_code == 200
    assert rejected.json()["status"] == "rejected"
    assert rejected.json()["current_level"] == "completed"

    other_history = client.get(
        f"/approvals/{approval_id}/history",
        headers=other_employee_headers,
    )
    assert other_history.status_code == 403

    admin_level = create_approval(employee_headers, "Reject at admin").json()
    admin_level_id = admin_level["id"]
    manager_approve = client.patch(
        f"/approvals/{admin_level_id}/action",
        json={"action": "approve", "comment": "Move to admin"},
        headers=manager_headers,
    )
    assert manager_approve.status_code == 200

    admin_reject_without_comment = client.patch(
        f"/approvals/{admin_level_id}/action",
        json={"action": "reject"},
        headers=admin_headers,
    )
    assert admin_reject_without_comment.status_code == 400

    admin_reject = client.patch(
        f"/approvals/{admin_level_id}/action",
        json={"action": "reject", "comment": "Final rejection reason"},
        headers=admin_headers,
    )
    assert admin_reject.status_code == 200
    assert admin_reject.json()["status"] == "rejected"
    assert admin_reject.json()["current_level"] == "completed"


def test_day_3_approval_routes_are_in_openapi():
    schema = client.get("/openapi.json").json()
    assert "/approvals/" in schema["paths"]
    assert "/approvals/{approval_id}/action" in schema["paths"]
    assert "/approvals/{approval_id}/history" in schema["paths"]


def test_dashboard_analytics_are_role_aware():
    register_user("dashboard-admin@example.com", role="admin")
    manager = register_user("dashboard-manager@example.com", role="manager").json()
    employee = register_user("dashboard-employee@example.com").json()
    other_employee = register_user("dashboard-other@example.com").json()

    admin_headers = auth_headers("dashboard-admin@example.com")
    manager_headers = auth_headers("dashboard-manager@example.com")
    employee_headers = auth_headers("dashboard-employee@example.com")
    other_employee_headers = auth_headers("dashboard-other@example.com")

    first_task = create_task(admin_headers, assigned_to_id=employee["id"]).json()
    second_task = create_task(manager_headers, assigned_to_id=employee["id"]).json()
    create_task(admin_headers, assigned_to_id=other_employee["id"])

    client.patch(
        f"/tasks/{first_task['id']}/status",
        json={"status": "in_progress", "comment": "Started"},
        headers=employee_headers,
    )
    client.post(
        f"/tasks/{first_task['id']}/comments",
        json={"content": "Dashboard public comment", "is_internal": False},
        headers=employee_headers,
    )
    client.post(
        f"/tasks/{second_task['id']}/comments",
        json={"content": "Dashboard internal note", "is_internal": True},
        headers=manager_headers,
    )
    create_approval(employee_headers, "Dashboard approval")

    admin_summary = client.get("/dashboard/summary", headers=admin_headers)
    assert admin_summary.status_code == 200
    assert admin_summary.json()["total_tasks"] == 3
    assert admin_summary.json()["total_comments"] == 2
    assert admin_summary.json()["pending_approvals"] == 1

    employee_summary = client.get("/dashboard/summary", headers=employee_headers)
    assert employee_summary.status_code == 200
    assert employee_summary.json()["total_tasks"] == 2
    assert employee_summary.json()["total_comments"] == 1

    manager_summary = client.get("/dashboard/summary", headers=manager_headers)
    assert manager_summary.status_code == 200
    assert manager_summary.json()["total_tasks"] == 1

    task_distribution = client.get("/dashboard/task-distribution", headers=admin_headers)
    assert task_distribution.status_code == 200
    assert set(task_distribution.json()) == {"todo", "in_progress", "review", "done"}

    priority_distribution = client.get(
        "/dashboard/priority-distribution",
        headers=admin_headers,
    )
    assert priority_distribution.status_code == 200
    assert set(priority_distribution.json()) == {"low", "medium", "high"}

    approval_summary = client.get("/dashboard/approval-summary", headers=admin_headers)
    assert approval_summary.status_code == 200
    assert set(approval_summary.json()) == {
        "pending",
        "manager_approved",
        "admin_approved",
        "rejected",
        "hold",
    }

    recent_activity = client.get("/dashboard/recent-activity", headers=admin_headers)
    assert recent_activity.status_code == 200
    assert any(item["type"] == "task_activity" for item in recent_activity.json())
    assert any(item["type"] == "approval_history" for item in recent_activity.json())


def test_day_4_dashboard_routes_are_in_openapi():
    schema = client.get("/openapi.json").json()
    assert "/dashboard/summary" in schema["paths"]
    assert "/dashboard/task-distribution" in schema["paths"]
    assert "/dashboard/priority-distribution" in schema["paths"]
    assert "/dashboard/approval-summary" in schema["paths"]
    assert "/dashboard/recent-activity" in schema["paths"]
