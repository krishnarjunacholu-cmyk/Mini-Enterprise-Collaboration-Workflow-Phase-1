import { Link, NavLink, useNavigate } from "react-router-dom";

import { canCreateTasks, clearSession } from "../utils/auth";

export default function Navbar({ user }) {
  const navigate = useNavigate();

  function logout() {
    clearSession();
    navigate("/login");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur lg:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <Link to="/dashboard" className="min-w-0">
          <p className="truncate text-base font-bold text-slate-950">Enterprise Collaboration</p>
          {user && (
            <p className="truncate text-xs text-slate-500">
              {user.name} | <span className="capitalize">{user.role}</span>
            </p>
          )}
        </Link>
        <button className="btn-secondary px-3 py-1.5" type="button" onClick={logout}>
          Logout
        </button>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-3 py-2">
        <NavLink
          className={({ isActive }) => `mobile-nav-link ${isActive ? "mobile-nav-link-active" : ""}`}
          to="/dashboard"
        >
          Dashboard
        </NavLink>
        {canCreateTasks(user) && (
          <NavLink
            className={({ isActive }) => `mobile-nav-link ${isActive ? "mobile-nav-link-active" : ""}`}
            to="/tasks/create"
          >
            Create Task
          </NavLink>
        )}
      </nav>
    </header>
  );
}
