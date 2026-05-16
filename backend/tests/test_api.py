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

    status_update = client.put(
        f"/tasks/{task_id}",
        json={"status": "done"},
        headers=employee_headers,
    )
    assert status_update.status_code == 200
    assert status_update.json()["status"] == "done"

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
