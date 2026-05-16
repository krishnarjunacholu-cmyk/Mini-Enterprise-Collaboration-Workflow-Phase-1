# Mini Enterprise Collaboration API

FastAPI backend for the Mini Enterprise Collaboration & Workflow Project.

## Completed Features

### Day 1: Backend Foundation

- FastAPI backend setup
- MySQL database connection with SQLAlchemy
- User registration
- Login with JWT token
- `/auth/me` protected endpoint
- Basic users API
- Roles: `admin`, `manager`, `employee`
- JWT authentication dependencies
- Swagger UI

### Day 2: Role-Based Access + Task Backend APIs

- Task model
- Task CRUD APIs
- Role-based task visibility
- Task assignment API
- Admin, manager, and employee permissions
- Swagger testing instructions
- MySQL verification queries

### Day 3: Frontend Dashboard + API Integration

- React frontend created with Vite
- Tailwind CSS setup
- Axios API integration
- React Router setup
- JWT token stored in localStorage
- Protected frontend routes
- Dashboard task list
- Create task form
- Edit task form
- Role-based UI actions

## Project Structure

```text
backend/
├── app/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── auth_utils.py
│   ├── dependencies.py
│   └── routers/
│       ├── auth.py
│       ├── users.py
│       └── tasks.py
├── alembic/
├── requirements.txt
├── .env
├── .env.example
├── .gitignore
└── README.md
```

## Setup

Install dependencies:

```bash
pip install -r requirements.txt
```

Create the MySQL database:

```sql
CREATE DATABASE enterprise_workflow_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Configure `.env`:

```env
DATABASE_URL=mysql+pymysql://root:your_mysql_password@localhost:3306/enterprise_workflow_db
SECRET_KEY=your-secret-key-change-this-in-production-keep-it-long-and-random
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
DEBUG=True
```

Run the server from the `backend` directory:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Open Swagger:

```text
http://127.0.0.1:8000/docs
```

## Authentication APIs

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `GET /users/{user_id}`
- `GET /users/` admin only

## Task APIs

- `POST /tasks/`
- `GET /tasks/`
- `GET /tasks/{task_id}`
- `PUT /tasks/{task_id}`
- `DELETE /tasks/{task_id}`
- `PATCH /tasks/{task_id}/assign`

## Role Rules

Admin:

- Full task access
- Can create, view, update, assign, and delete any task
- Can assign tasks to any active user

Manager:

- Can create tasks
- Can view tasks created by them or assigned to them
- Can update tasks created by them or assigned to them
- Can assign only their created tasks
- Can assign tasks only to employees
- Can delete only tasks created by them

Employee:

- Can view only assigned tasks
- Can update only assigned task status
- Cannot create tasks
- Cannot assign tasks
- Cannot delete tasks

## Swagger Testing Data

Create or use these users:

Admin:

```text
email: krishnarjuna.admin@example.com
password: AdminKrishnarjuna
```

Manager:

```text
email: manager@example.com
password: manager123
```

Employee:

```text
email: employee@example.com
password: employee123
```

## Swagger Testing Checklist

Admin tests:

1. Login as admin.
2. Create task as admin.
3. Assign task to employee as admin.
4. List all tasks as admin.
5. Get task by id as admin.
6. Update task as admin.
7. Delete task as admin.

Manager tests:

1. Login as manager.
2. Create task as manager.
3. Assign task to employee as manager.
4. Try assigning task to admin as manager and confirm `403`.
5. List tasks as manager.
6. Delete only manager-created task.

Employee tests:

1. Login as employee.
2. List tasks and confirm only assigned tasks are visible.
3. Get assigned task details.
4. Update only status.
5. Try creating task and confirm forbidden.
6. Try assigning task and confirm forbidden.
7. Try deleting task and confirm forbidden.

## Example Task Request Bodies

Create task:

```json
{
  "title": "Prepare sprint report",
  "description": "Summarize team progress and blockers.",
  "status": "todo",
  "priority": "medium",
  "due_date": "2026-05-20T18:00:00",
  "assigned_to_id": 3
}
```

Assign task:

```json
{
  "assigned_to_id": 3
}
```

Employee status update:

```json
{
  "status": "done"
}
```

## MySQL Verification Queries

```sql
USE enterprise_workflow_db;

SHOW TABLES;

SELECT * FROM tasks;

SELECT
    t.id,
    t.title,
    t.status,
    t.priority,
    creator.name AS created_by,
    assignee.name AS assigned_to,
    t.created_at,
    t.updated_at
FROM tasks t
LEFT JOIN users creator ON t.created_by_id = creator.id
LEFT JOIN users assignee ON t.assigned_to_id = assignee.id;
```

## Tests

Run automated tests:

```bash
python -m pytest -q
```

## Frontend

Run the React frontend from the project root:

```bash
cd frontend
npm install
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

## GitHub Commands

Do not push automatically. Use these when you are ready:

```bash
git add .
git commit -m "Day 2 task APIs with role-based access control"
git push
```
