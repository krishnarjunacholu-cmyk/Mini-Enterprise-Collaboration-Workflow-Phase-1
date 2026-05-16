# Mini Enterprise Collaboration & Workflow Project

## Problem Statement

Modern organizations require a centralized system to manage tasks, assign responsibilities, and track progress efficiently. This project provides a secure role-based task management system where Admins, Managers, and Employees can collaborate through task creation, assignment, tracking, and updates.

## Project Objective

- Implement JWT-based authentication
- Enforce role-based access control
- Manage users and tasks
- Assign tasks across team members
- Provide a simple frontend dashboard
- Integrate React frontend with FastAPI backend

## Tech Stack

Backend:

- FastAPI
- SQLAlchemy
- Pydantic
- MySQL
- JWT using `python-jose`
- bcrypt password hashing
- Alembic configured

Frontend:

- React.js
- Tailwind CSS
- Axios
- React Router DOM

Tools:

- VS Code
- GitHub
- Swagger UI / Postman
- MySQL Workbench

## User Roles

Admin:

- Full system access
- View all users
- View all tasks
- Create, update, assign, and delete tasks

Manager:

- Create tasks
- Assign tasks to employees
- View relevant tasks
- Manage tasks related to them

Employee:

- View only assigned tasks
- Update task status
- Cannot assign or delete tasks

## Features

Authentication:

- User registration
- User login
- JWT token generation
- Protected routes
- Current logged-in user API

User Management:

- Admin can view all users
- User detail API

Task Management:

- Create task
- View tasks
- View task details
- Update task
- Delete task
- Assign task

Frontend:

- Login page
- Register page
- Dashboard
- Create task form
- Edit task form
- Role-based UI actions
- Protected routing

## API List

Authentication APIs:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

User APIs:

- `GET /users/`
- `GET /users/{user_id}`

Task APIs:

- `POST /tasks/`
- `GET /tasks/`
- `GET /tasks/{task_id}`
- `PUT /tasks/{task_id}`
- `DELETE /tasks/{task_id}`
- `PATCH /tasks/{task_id}/assign`

Health APIs:

- `GET /`
- `GET /health`

## Setup Instructions

Backend setup:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend URL:

```text
http://127.0.0.1:8000
```

Swagger URL:

```text
http://127.0.0.1:8000/docs
```

Frontend setup:

```bash
cd frontend
npm install
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

## Environment Variables

Add `.env` file in the `backend` folder:

```env
DATABASE_URL=mysql+pymysql://username:password@localhost:3306/mini_enterprise_workflow
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
DEBUG=True
```

Do not push `.env` to GitHub.

## Testing Credentials

Admin:

```text
Email: krishnarjuna.admin@example.com
Password: AdminKrishnarjuna
```

Manager:

```text
Email: manager@example.com
Password: manager123
```

Employee:

```text
Email: employee@example.com
Password: employee123
```

## Full Workflow Testing

Admin:

1. Login as admin.
2. Create a task.
3. Assign task to employee.
4. View all tasks.
5. Edit task.
6. Delete task.

Manager:

1. Login as manager.
2. Create a task.
3. Assign task to employee.
4. View only relevant tasks.
5. Edit allowed task.
6. Try assigning a task to admin and confirm `403`.
7. Try accessing unauthorized task and confirm `403`.

Employee:

1. Login as employee.
2. View only assigned tasks.
3. View assigned task details.
4. Update only task status.
5. Confirm create, assign, and delete actions are blocked.

Unauthorized action checks:

- Duplicate email returns `400`
- Invalid role returns validation error
- Wrong password returns `401`
- Missing token returns `401`
- Non-admin accessing `/users/` returns `403`
- Employee creating task returns `403`
- Employee assigning task returns `403`
- Employee deleting task returns `403`
- Invalid task id returns `404`
- Assigned user not found returns `400`

## MySQL Verification Queries

Use this database if you follow the sample `.env`:

```sql
USE mini_enterprise_workflow;
```

If your local `.env` uses another database name, use that database instead.

```sql
SHOW TABLES;

SELECT
    id,
    name,
    email,
    role,
    is_active,
    created_at,
    updated_at
FROM users;

SELECT
    email,
    hashed_password
FROM users;

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

## Screenshots

### Swagger Screenshots

Save these under `screenshots/swagger/`:

- `swagger_home.png`
- `register_admin_success.png`
- `register_manager_success.png`
- `register_employee_success.png`
- `login_token_success.png`
- `auth_me_success.png`
- `users_list_admin.png`
- `create_task_admin.png`
- `assign_task_admin.png`
- `list_tasks_admin.png`
- `create_task_manager.png`
- `assign_task_manager.png`
- `employee_tasks_only.png`
- `employee_update_status.png`
- `unauthorized_action_403.png`

### Frontend Screenshots

Save these under `screenshots/frontend/`:

- `login_page.png`
- `register_page.png`
- `admin_dashboard.png`
- `manager_dashboard.png`
- `employee_dashboard.png`
- `create_task_form.png`
- `edit_task_form.png`
- `role_based_task_view.png`
- `unauthorized_action_message.png`

### MySQL Screenshots

Save these under `screenshots/mysql/`:

- `users_table.png`
- `tasks_table.png`
- `users_with_hashed_passwords.png`
- `task_assignment_join_query.png`

## Final Verification Checklist

Backend:

- [ ] Server runs successfully
- [ ] Swagger opens
- [ ] Auth APIs tested
- [ ] User APIs tested
- [ ] Task APIs tested
- [ ] Role restrictions tested

Frontend:

- [ ] Login page works
- [ ] Register page works
- [ ] Dashboard works
- [ ] Create task works
- [ ] Edit task works
- [ ] Role-based UI works

Database:

- [ ] Users table verified
- [ ] Passwords are hashed
- [ ] Tasks table verified
- [ ] Task assignment verified

Submission:

- [ ] Screenshots added
- [ ] README completed
- [ ] Code pushed to GitHub
- [ ] Final project verified

## Final Project Status

- Backend completed
- Frontend completed
- Authentication completed
- Role-based access completed
- Task CRUD completed
- Task assignment completed
- Frontend-backend integration completed
- Swagger testing completed
- README completed
- GitHub submission ready

## GitHub Commands

Do not push automatically. Use these when ready:

```bash
git status
git add .
git commit -m "Final submission ready with testing screenshots and README"
git push
```

If there are branch issues:

```bash
git branch -M main
git push -u origin main
```
