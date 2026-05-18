# Enterprise Collaboration Frontend

React frontend for Day 3 of the Mini Enterprise Collaboration & Workflow Project.

## Features

- React frontend created with Vite
- Tailwind CSS setup
- Axios API integration with FastAPI
- React Router setup
- JWT token stored in `localStorage`
- Protected routes
- Login and register pages
- Dashboard task list
- Create task form
- Edit task form
- Role-based UI actions for admin, manager, and employee

## Folder Structure

```text
frontend/
├── src/
│   ├── api/
│   │   └── axios.js
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── ProtectedRoute.jsx
│   │   ├── TaskCard.jsx
│   │   ├── Sidebar.jsx
│   │   ├── StatusBadge.jsx
│   │   ├── PriorityBadge.jsx
│   │   └── LoadingSpinner.jsx
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Dashboard.jsx
│   │   ├── CreateTask.jsx
│   │   └── EditTask.jsx
│   ├── utils/
│   │   └── auth.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── package.json
├── tailwind.config.js
└── README.md
```

## Backend URL

The frontend connects to:

```text
http://127.0.0.1:8000
```

## Run Frontend

Start the backend first:

```bash
cd backend
uvicorn app.main:app --reload
```

Then start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

Backend Swagger:

```text
http://127.0.0.1:8000/docs
```

## Test Users

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

## Testing Checklist

Admin:

1. Login as admin.
2. View dashboard.
3. Create task.
4. Assign task to employee.
5. Edit task.
6. Delete task.
7. Logout.

Manager:

1. Login as manager.
2. View manager-visible tasks.
3. Create task.
4. Assign task to employee.
5. Try restricted action and confirm the backend error is shown.

Employee:

1. Login as employee.
2. View only assigned tasks.
3. Update status only.
4. Confirm create, assign, and delete actions are hidden or blocked.

## Available Scripts

```bash
npm run dev
npm run build
npm run preview
```

## GitHub Commands

```bash
git add .
git commit -m "Day 3 frontend dashboard with API integration"
git push
```
