import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api, { getApiError } from "../api/axios";
import LoadingSpinner from "../components/LoadingSpinner";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import TaskCard from "../components/TaskCard";
import { canCreateTasks, getStoredUser, saveUser } from "../utils/auth";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getStoredUser());
  const [tasks, setTasks] = useState([]);
  const [assignInputs, setAssignInputs] = useState({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setError("");
    setLoading(true);

    try {
      const [meResponse, tasksResponse] = await Promise.all([
        api.get("/auth/me"),
        api.get("/tasks/"),
      ]);
      saveUser(meResponse.data);
      setUser(meResponse.data);
      setTasks(tasksResponse.data);
    } catch (err) {
      setError(getApiError(err));
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDashboard();
  }, [loadDashboard]);

  const stats = useMemo(() => {
    return {
      total: tasks.length,
      todo: tasks.filter((task) => task.status === "todo").length,
      inProgress: tasks.filter((task) => task.status === "in_progress").length,
      done: tasks.filter((task) => task.status === "done").length,
    };
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesSearch =
        !query ||
        task.title.toLowerCase().includes(query) ||
        (task.description || "").toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tasks, search, statusFilter]);

  function setAssignValue(taskId, value) {
    setAssignInputs((current) => ({ ...current, [taskId]: value }));
  }

  async function updateStatus(taskId, status) {
    setError("");
    setMessage("");

    try {
      const response = await api.put(`/tasks/${taskId}`, { status });
      setTasks((current) => current.map((task) => (task.id === taskId ? response.data : task)));
      setMessage("Task status updated.");
    } catch (err) {
      setError(getApiError(err));
    }
  }

  async function assignTask(taskId) {
    setError("");
    setMessage("");

    const assignedToId = Number(assignInputs[taskId]);
    if (!assignedToId) {
      setError("Enter a valid user id before assigning.");
      return;
    }

    try {
      const response = await api.patch(`/tasks/${taskId}/assign`, {
        assigned_to_id: assignedToId,
      });
      setTasks((current) => current.map((task) => (task.id === taskId ? response.data : task)));
      setMessage("Task assigned successfully.");
    } catch (err) {
      setError(getApiError(err));
    }
  }

  async function deleteTask(taskId) {
    setError("");
    setMessage("");

    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks((current) => current.filter((task) => task.id !== taskId));
      setMessage("Task deleted successfully.");
    } catch (err) {
      setError(err.response?.status === 403 ? "You do not have permission to delete this task." : getApiError(err));
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar user={user} />
      <Navbar user={user} />

      <main className="px-4 py-6 lg:ml-72 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <section className="dashboard-header">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-indigo-700">Workflow overview</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Welcome back, {user?.name || "team member"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Your tasks are filtered by the backend based on your role. Use this dashboard to track status,
                priorities, assignments, and updates.
              </p>
            </div>
            {canCreateTasks(user) && (
              <Link className="btn-primary" to="/tasks/create">
                Create Task
              </Link>
            )}
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Task summary">
            <StatCard label="Total tasks" value={stats.total} tone="blue" />
            <StatCard label="Todo" value={stats.todo} tone="slate" />
            <StatCard label="In progress" value={stats.inProgress} tone="amber" />
            <StatCard label="Completed" value={stats.done} tone="green" />
          </section>

          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[1fr_180px_auto] lg:items-end">
              <div>
                <label className="field-label" htmlFor="task-search">
                  Search tasks
                </label>
                <input
                  className="input"
                  id="task-search"
                  placeholder="Search by title or description"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="status-filter">
                  Status
                </label>
                <select
                  className="input"
                  id="status-filter"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="all">All</option>
                  <option value="todo">todo</option>
                  <option value="in_progress">in_progress</option>
                  <option value="done">done</option>
                </select>
              </div>
              <button className="btn-secondary" type="button" onClick={loadDashboard}>
                Refresh
              </button>
            </div>
          </section>

          {error && <div className="notice-error mt-4">{error}</div>}
          {message && <div className="notice-success mt-4">{message}</div>}

          <section className="mt-6">
            {loading ? (
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <LoadingSpinner label="Loading tasks..." />
              </div>
            ) : visibleTasks.length === 0 ? (
              <div className="empty-state">
                <h2 className="text-lg font-semibold text-slate-950">No tasks found</h2>
                <p className="mt-2 text-sm text-slate-600">
                  There are no tasks matching your current role and filters.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {visibleTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    user={user}
                    assignValue={assignInputs[task.id]}
                    onAssign={assignTask}
                    onAssignValueChange={setAssignValue}
                    onDelete={deleteTask}
                    onStatusChange={updateStatus}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, tone }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    slate: "bg-slate-50 text-slate-700 ring-slate-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    green: "bg-green-50 text-green-700 ring-green-200",
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-bold text-slate-950">{value}</p>
      <span className={`mt-4 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tones[tone]}`}>
        Live
      </span>
    </div>
  );
}
