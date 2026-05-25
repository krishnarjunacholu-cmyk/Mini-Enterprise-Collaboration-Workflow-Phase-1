import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api, { getApiError } from "../api/axios";
import Alert from "../components/Alert";
import AppLayout from "../components/AppLayout";
import LoadingSpinner from "../components/LoadingSpinner";
import TaskCard from "../components/TaskCard";
import { canCreateTasks, getStoredUser, saveUser } from "../utils/auth";

export default function Tasks() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getStoredUser());
  const [tasks, setTasks] = useState([]);
  const [userNames, setUserNames] = useState({});
  const [assignInputs, setAssignInputs] = useState({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadTasks = useCallback(async () => {
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

      if (meResponse.data.role === "admin") {
        const usersResponse = await api.get("/users/");
        setUserNames(Object.fromEntries(usersResponse.data.map((item) => [item.id, item.name])));
      } else {
        setUserNames({});
      }
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
    void loadTasks();
  }, [loadTasks]);

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
      const response = await api.patch(`/tasks/${taskId}/status`, {
        status,
        comment: "Status updated from tasks page",
      });
      setTasks((current) => current.map((task) => (task.id === taskId ? response.data : task)));
      setMessage("Task status updated.");
      await loadTasks();
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
      const response = await api.patch(`/tasks/${taskId}/assign`, { assigned_to_id: assignedToId });
      setTasks((current) => current.map((task) => (task.id === taskId ? response.data : task)));
      setMessage("Task assigned successfully.");
      await loadTasks();
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
      await loadTasks();
    } catch (err) {
      setError(err.response?.status === 403 ? "You do not have permission to delete this task." : getApiError(err));
    }
  }

  return (
    <AppLayout user={user}>
      <section className="dashboard-header">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-indigo-700">Task management</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            {user?.role === "employee" ? "My Tasks" : "Tasks"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            View, filter, assign, and update tasks based on your role permissions.
          </p>
        </div>
        {canCreateTasks(user) && (
          <Link className="btn-primary" to="/tasks/create">Create Task</Link>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_auto] lg:items-end">
          <div>
            <label className="field-label" htmlFor="task-search">Search tasks</label>
            <input
              className="input"
              id="task-search"
              placeholder="Search by title or description"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="status-filter">Status</label>
            <select
              className="input"
              id="status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All</option>
              <option value="todo">todo</option>
              <option value="in_progress">in_progress</option>
              <option value="review">review</option>
              <option value="done">done</option>
            </select>
          </div>
          <button className="btn-secondary" type="button" onClick={loadTasks}>Refresh</button>
        </div>
      </section>

      {error && <Alert className="mt-4">{error}</Alert>}
      {message && <Alert className="mt-4" type="success">{message}</Alert>}

      <section className="mt-6">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <LoadingSpinner label="Loading tasks..." />
          </div>
        ) : visibleTasks.length === 0 ? (
          <div className="empty-state">
            <h2 className="text-lg font-semibold text-slate-950">No tasks found</h2>
            <p className="mt-2 text-sm text-slate-600">No tasks match your role and filters.</p>
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
                userNames={userNames}
              />
            ))}
          </div>
        )}
      </section>
    </AppLayout>
  );
}
