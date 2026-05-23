import { Link, NavLink, useNavigate } from "react-router-dom";

import { canCreateTasks, clearSession } from "../utils/auth";

export default function Sidebar({ user }) {
  const navigate = useNavigate();

  function logout() {
    clearSession();
    navigate("/login");
  }

  return (
    <aside className="hidden min-h-screen w-72 shrink-0 border-r border-slate-200 bg-white px-4 py-5 lg:fixed lg:inset-y-0 lg:left-0 lg:block">
      <Link to="/dashboard" className="block rounded-xl px-3 py-2">
        <p className="text-lg font-bold text-slate-950">Enterprise Collaboration</p>
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
          Workflow dashboard
        </p>
      </Link>

      <nav className="mt-6 space-y-1">
        <NavLink
          className={({ isActive }) => `sidebar-link ${isActive ? "sidebar-link-active" : ""}`}
          to="/dashboard"
        >
          Dashboard
        </NavLink>
        <NavLink
          className={({ isActive }) => `sidebar-link ${isActive ? "sidebar-link-active" : ""}`}
          to="/kanban"
        >
          Kanban Board
        </NavLink>
        <NavLink
          className={({ isActive }) => `sidebar-link ${isActive ? "sidebar-link-active" : ""}`}
          to="/dashboard"
        >
          {user?.role === "employee" ? "My Tasks" : "Tasks"}
        </NavLink>
        {canCreateTasks(user) && (
          <NavLink
            className={({ isActive }) => `sidebar-link ${isActive ? "sidebar-link-active" : ""}`}
            to="/tasks/create"
          >
            Create Task
          </NavLink>
        )}
        <NavLink
          className={({ isActive }) => `sidebar-link ${isActive ? "sidebar-link-active" : ""}`}
          to="/approvals"
        >
          Approvals
        </NavLink>
        <NavLink
          className={({ isActive }) => `sidebar-link ${isActive ? "sidebar-link-active" : ""}`}
          to="/approvals/create"
        >
          Create Approval
        </NavLink>
      </nav>

      <div className="absolute bottom-5 left-4 right-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
        <p className="truncate text-sm font-semibold text-slate-950">{user?.name || "Signed in user"}</p>
        <span className="mt-2 inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold capitalize text-indigo-700 ring-1 ring-indigo-200">
          {user?.role || "user"}
        </span>
        <button className="btn-secondary mt-4 w-full" type="button" onClick={logout}>
          Logout
        </button>
      </div>
    </aside>
  );
}
