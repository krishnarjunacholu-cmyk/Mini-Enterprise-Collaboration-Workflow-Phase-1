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

## Phase 2 Day 1: Kanban Workflow

Phase 2 Day 1 adds backend Kanban workflow support without changing the React drag-and-drop UI yet.

Kanban status stages:

- `todo`
- `in_progress`
- `review`
- `done`

Status transition rules:

- Allowed forward flow: `todo` → `in_progress` → `review` → `done`
- Admin and Manager can also move `review` → `in_progress`
- Admin and Manager can also move `in_progress` → `todo`
- Invalid jumps such as `todo` -> `done`, `todo` -> `review`, `in_progress` -> `done`, and any movement from `done` are rejected with `400`

Kanban APIs:

- `GET /tasks/kanban`
- `PATCH /tasks/{task_id}/status`
- `GET /tasks/{task_id}/status-history`

Status history tracking:

- Every valid status change is saved in `task_status_history`
- The history stores task id, old status, new status, changed-by user id, optional comment, and timestamp
- Tasks also store `updated_by_id` for the last user who changed the status

Migration and server commands:

```bash
cd backend
venv\Scripts\activate
alembic upgrade head
uvicorn app.main:app --reload
```

Swagger URL:

```text
http://127.0.0.1:8000/docs
```

Phase 2 Day 1 Swagger testing steps:

1. Login as Admin using `krishnarjuna.admin@example.com` / `AdminKrishnarjuna`.
2. Authorize Swagger with the admin Bearer token.
3. Run `GET /tasks/kanban` and confirm tasks are grouped under `todo`, `in_progress`, `review`, and `done`.
4. Pick a task with status `todo`, then run `PATCH /tasks/{task_id}/status` with `{"status": "in_progress", "comment": "Started working on this task"}`.
5. Run `PATCH /tasks/{task_id}/status` with `{"status": "review", "comment": "Ready for review"}`.
6. Run `PATCH /tasks/{task_id}/status` with `{"status": "done", "comment": "Completed"}`.
7. Create or pick another `todo` task and try `PATCH /tasks/{task_id}/status` with `{"status": "done"}`. Confirm `400` with `Invalid status transition. Task must follow TODO → IN PROGRESS → REVIEW → DONE workflow.`
8. Run `GET /tasks/{task_id}/status-history` and confirm status changes are listed.
9. Login as Employee using `sasa.employee@example.com` / `sasa987`.
10. Update only an assigned task status and confirm success.
11. Try updating an unassigned or another user's task and confirm `403`.
12. Login as Manager using `ridha.manager@example.com` / `ridha456`.
13. Run `GET /tasks/kanban` and confirm the manager sees only tasks created by them or assigned to them.

Phase 2 Day 1 MySQL verification queries:

```sql
SHOW TABLES;

SELECT id, title, status, updated_by_id, created_by_id, assigned_to_id
FROM tasks;

SELECT *
FROM task_status_history;

SELECT
    h.id,
    t.title,
    h.old_status,
    h.new_status,
    u.name AS changed_by,
    h.comment,
    h.created_at
FROM task_status_history h
LEFT JOIN tasks t ON h.task_id = t.id
LEFT JOIN users u ON h.changed_by_id = u.id
ORDER BY h.created_at DESC;
```

## Phase 2 Day 2: Comments & Activity Tracking

Phase 2 Day 2 adds backend task collaboration with comments, internal notes, and activity logs.

Comments module:

- Users can add comments to tasks they can access
- Admins and managers can create public comments and internal notes
- Employees can create only public comments
- Employees cannot see internal comments

Activity tracking:

- Comment activity is saved in `task_activity`
- Public comments use action `comment_added`
- Internal notes use action `internal_note_added`
- Status changes, task assignment, and task updates also create activity rows

Comment and activity APIs:

- `POST /tasks/{task_id}/comments`
- `GET /tasks/{task_id}/comments`
- `GET /tasks/{task_id}/activity`

Role-based comment rules:

- Admin can comment on any task and view all comments
- Manager can comment on tasks created by them or assigned to them and view internal comments on those tasks
- Employee can comment only on assigned tasks, can create only public comments, and sees only public comments

Day 2 migration and server commands:

```bash
cd backend
venv\Scripts\activate
alembic upgrade head
uvicorn app.main:app --reload
```

Phase 2 Day 2 Swagger testing steps:

1. Login as Admin using `krishnarjuna.admin@example.com` / `AdminKrishnarjuna`.
2. Authorize Swagger with the admin Bearer token.
3. Run `POST /tasks/{task_id}/comments` with `{"content": "Please update the progress before evening.", "is_internal": false}`.
4. Run `POST /tasks/{task_id}/comments` with `{"content": "Internal admin note", "is_internal": true}`.
5. Run `GET /tasks/{task_id}/comments` and confirm admin sees public and internal comments.
6. Run `GET /tasks/{task_id}/activity` and confirm `comment_added` and `internal_note_added` are listed.
7. Login as Manager using `ridha.manager@example.com` / `ridha456`.
8. Add public and internal comments to a manager-accessible task.
9. Try commenting on a task the manager cannot access and confirm `403`.
10. Login as Employee using `sasa.employee@example.com` / `sasa987`.
11. Add a public comment to an assigned task.
12. Try adding an internal comment with `{"content": "Private note", "is_internal": true}` and confirm `403` with `Employees cannot create internal comments`.
13. Run `GET /tasks/{task_id}/comments` as employee and confirm only public comments are visible.
14. Try commenting on an unassigned task and confirm `403`.

Phase 2 Day 2 MySQL verification queries:

```sql
SHOW TABLES;

SELECT *
FROM comments;

SELECT *
FROM task_activity;

SELECT
    c.id,
    t.title AS task_title,
    u.name AS commented_by,
    c.content,
    c.is_internal,
    c.created_at
FROM comments c
LEFT JOIN tasks t ON c.task_id = t.id
LEFT JOIN users u ON c.user_id = u.id
ORDER BY c.created_at DESC;

SELECT
    a.id,
    t.title AS task_title,
    u.name AS action_by,
    a.action,
    a.details,
    a.created_at
FROM task_activity a
LEFT JOIN tasks t ON a.task_id = t.id
LEFT JOIN users u ON a.user_id = u.id
ORDER BY a.created_at DESC;
```

## Phase 2 Day 3: Approval Workflow

Phase 2 Day 3 adds an enterprise approval workflow with audit history.

Approval flow:

- Employee submits approval request
- Manager reviews at manager level
- Admin gives final approval at admin level

Approval statuses:

- `pending`
- `manager_approved`
- `admin_approved`
- `rejected`
- `hold`

Approval levels:

- `manager`
- `admin`
- `completed`

Approval actions:

- `approve`
- `reject`
- `hold`

Approval APIs:

- `POST /approvals/`
- `GET /approvals/`
- `PATCH /approvals/{approval_id}/action`
- `GET /approvals/{approval_id}/history`

Approval rules:

- Any authenticated user can submit an approval request
- Employees can view only approvals they requested
- Employees cannot approve, reject, or hold approvals
- Managers can act only when `current_level = manager`
- Manager approval moves the request to `current_level = admin`
- Admins can view all approvals
- Admins can act only when `current_level = admin`
- Admin approval moves the request to `current_level = completed`
- Rejecting always requires a comment
- Every submission and action is saved in `approval_history`

Day 3 migration and server commands:

```bash
cd backend
venv\Scripts\activate
alembic upgrade head
uvicorn app.main:app --reload
```

Phase 2 Day 3 Swagger testing steps:

1. Login as Employee using `sasa.employee@example.com` / `sasa987`.
2. Run `POST /approvals/` with `{"title": "Request for task completion approval", "description": "Please review and approve the completed work."}`.
3. Run `GET /approvals/` and confirm the employee sees only their own approvals.
4. Try `PATCH /approvals/{approval_id}/action` as employee and confirm `403`.
5. Login as Manager using `ridha.manager@example.com` / `ridha456`.
6. Run `GET /approvals/` and confirm manager-level approvals are visible.
7. Run `PATCH /approvals/{approval_id}/action` with `{"action": "approve", "comment": "Approved by manager"}`.
8. Create another approval request and reject as manager with `{"action": "reject", "comment": "Rejected because details are incomplete"}`.
9. Try rejecting without a comment and confirm `400` with `Rejection requires a comment`.
10. Run `GET /approvals/{approval_id}/history` and confirm manager action is recorded.
11. Login as Admin using `krishnarjuna.admin@example.com` / `AdminKrishnarjuna`.
12. Run `GET /approvals/` and confirm all approvals are visible.
13. Approve a manager-approved request using `PATCH /approvals/{approval_id}/action` with `{"action": "approve", "comment": "Final approval"}`.
14. Reject an admin-level request with `{"action": "reject", "comment": "Final rejection reason"}`.
15. Run `GET /approvals/{approval_id}/history` and confirm the full audit trail is available.

Phase 2 Day 3 MySQL verification queries:

```sql
SHOW TABLES;

SELECT *
FROM approvals;

SELECT *
FROM approval_history;

SELECT
    a.id,
    a.title,
    a.status,
    a.current_level,
    requester.name AS requested_by,
    a.created_at,
    a.updated_at
FROM approvals a
LEFT JOIN users requester ON a.requested_by_id = requester.id
ORDER BY a.created_at DESC;

SELECT
    h.id,
    a.title AS approval_title,
    actor.name AS action_by,
    h.action,
    h.comment,
    h.created_at
FROM approval_history h
LEFT JOIN approvals a ON h.approval_id = a.id
LEFT JOIN users actor ON h.action_by_id = actor.id
ORDER BY h.created_at DESC;
```

# Phase 2 — Workflow & Collaboration System

## Phase 2 Objective

Transform the basic task management system into a workflow-driven enterprise collaboration platform with Kanban tracking, workflow validation, comments, approvals, activity tracking, and analytics.

## Phase 2 Features

- Kanban workflow board
- Task lifecycle validation
- Status history tracking
- Comments module
- Public and internal notes
- Task activity tracking
- Approval workflow
- Employee → Manager → Admin approval hierarchy
- Approval audit history
- Dashboard analytics
- Role-based workflow restrictions

## Phase 2 APIs

Kanban:

- `GET /tasks/kanban`
- `PATCH /tasks/{id}/status`
- `GET /tasks/{id}/status-history`

Comments:

- `POST /tasks/{id}/comments`
- `GET /tasks/{id}/comments`
- `GET /tasks/{id}/activity`

Approvals:

- `POST /approvals/`
- `GET /approvals/`
- `PATCH /approvals/{id}/action`
- `GET /approvals/{id}/history`

Dashboard:

- `GET /dashboard/summary`
- `GET /dashboard/task-distribution`
- `GET /dashboard/priority-distribution`
- `GET /dashboard/approval-summary`
- `GET /dashboard/recent-activity`

## Role-Based Workflow Rules

Admin:

- Full visibility
- Final approval authority
- View analytics dashboard
- Manage all workflow data

Manager:

- Manage workflows
- Approve/reject employee requests
- Monitor team progress
- Add internal comments

Employee:

- Update assigned task status
- Submit approval requests
- Add public comments
- View assigned tasks only

## Workflow Rules

Allowed status flow:

```text
todo → in_progress → review → done
```

Invalid transitions are blocked by backend validation.

## Approval Rules

Employee submits request. Manager reviews first. Admin gives final approval if required. Rejection requires mandatory comment. All approval actions are stored in history.

## Phase 2 Day 4: Dashboard Enhancements & Frontend Integration

Day 4 connects Phase 2 backend features to the frontend and adds analytics APIs.

Frontend additions:

- Enhanced dashboard analytics cards
- Task status distribution bars
- Priority distribution bars
- Approval summary bars
- Recent activity feed
- Kanban board page with drag-and-drop status updates
- Comments panel on task edit page
- Task activity panel on task edit page
- Approvals list page
- Create approval page
- Approval history page
- Updated sidebar/mobile navigation

Day 4 testing URLs:

```text
Backend: http://127.0.0.1:8000
Swagger: http://127.0.0.1:8000/docs
Frontend: http://localhost:5173
```

Day 4 backend commands:

```bash
cd backend
uvicorn app.main:app --reload
```

Day 4 frontend commands:

```bash
cd frontend
npm install
npm run dev
```

Day 4 Swagger testing checklist:

- `GET /dashboard/summary`
- `GET /dashboard/task-distribution`
- `GET /dashboard/priority-distribution`
- `GET /dashboard/approval-summary`
- `GET /dashboard/recent-activity`
- `GET /tasks/kanban`
- `PATCH /tasks/{id}/status`
- `POST /tasks/{id}/comments`
- `GET /tasks/{id}/comments`
- `GET /tasks/{id}/activity`
- `POST /approvals/`
- `GET /approvals/`
- `PATCH /approvals/{id}/action`
- `GET /approvals/{id}/history`

Day 4 frontend testing checklist:

- Admin can view full dashboard analytics
- Admin can view Kanban board
- Admin can drag tasks through valid workflow
- Admin can add internal comments
- Admin can view task activity
- Admin can view and act on admin-level approvals
- Manager can view scoped dashboard analytics
- Manager can view scoped Kanban tasks
- Manager can add public/internal comments
- Manager can approve/reject/hold manager-level approvals
- Employee can view assigned tasks only
- Employee can move assigned tasks forward
- Employee can add public comments
- Employee cannot create internal comments
- Employee can create approval requests
- Employee cannot approve/reject/hold approvals

Day 4 invalid workflow tests:

- `todo → done` returns `400`
- `todo → review` returns `400`
- `in_progress → done` returns `400`
- `done → todo` returns `400`

Expected message:

```text
Invalid status transition. Task must follow TODO → IN PROGRESS → REVIEW → DONE workflow.
```

Phase 2 screenshot folders:

```text
screenshots/phase2/swagger/
screenshots/phase2/frontend/
screenshots/phase2/mysql/
```

Swagger screenshot checklist:

- `dashboard_summary_api.png`
- `task_distribution_api.png`
- `kanban_api.png`
- `status_update_api.png`
- `status_history_api.png`
- `add_comment_api.png`
- `get_comments_api.png`
- `task_activity_api.png`
- `create_approval_api.png`
- `approval_action_api.png`
- `approval_history_api.png`

Frontend screenshot checklist:

- `phase2_dashboard.png`
- `kanban_board.png`
- `drag_drop_status_update.png`
- `comments_ui.png`
- `task_activity_ui.png`
- `approvals_page.png`
- `create_approval_page.png`
- `approval_history_page.png`

MySQL screenshot checklist:

- `task_status_history_table.png`
- `comments_table.png`
- `task_activity_table.png`
- `approvals_table.png`
- `approval_history_table.png`

Phase 2 MySQL verification queries:

```sql
SHOW TABLES;

SELECT id, title, status, priority, created_by_id, assigned_to_id, updated_by_id
FROM tasks;

SELECT *
FROM task_status_history
ORDER BY created_at DESC;

SELECT *
FROM comments
ORDER BY created_at DESC;

SELECT *
FROM task_activity
ORDER BY created_at DESC;

SELECT *
FROM approvals
ORDER BY created_at DESC;

SELECT *
FROM approval_history
ORDER BY created_at DESC;

SELECT status, COUNT(*) AS total
FROM tasks
GROUP BY status;

SELECT priority, COUNT(*) AS total
FROM tasks
GROUP BY priority;

SELECT status, COUNT(*) AS total
FROM approvals
GROUP BY status;
```

Final GitHub commands:

```bash
git status
git add .
git commit -m "Phase 2 workflow collaboration system completed"
git push
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
