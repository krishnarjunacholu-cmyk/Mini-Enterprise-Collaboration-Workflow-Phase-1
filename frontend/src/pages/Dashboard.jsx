import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api, { getApiError } from "../api/axios";
import Alert from "../components/Alert";
import AppLayout from "../components/AppLayout";
import LoadingSpinner from "../components/LoadingSpinner";
import StatCard from "../components/StatCard";
import TaskCard from "../components/TaskCard";
import { canCreateTasks, getStoredUser, saveUser } from "../utils/auth";

const emptySummary = {
  total_tasks: 0,
  todo_tasks: 0,
  in_progress_tasks: 0,
  review_tasks: 0,
  completed_tasks: 0,
  pending_approvals: 0,
  total_comments: 0,
};

const distributionCardStyles = {
  "Task distribution": "border-slate-200 bg-white",
  "Priority distribution": "border-slate-200 bg-white",
  "Approval summary": "border-slate-200 bg-white",
};

function DistributionBars({ title, data }) {
  const entries = Object.entries(data || {});
  const max = Math.max(1, ...entries.map(([, value]) => value));

  return (
    <section className={`rounded-2xl border p-5 shadow-sm ${distributionCardStyles[title] || "border-slate-200 bg-white"}`}>
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <div className="mt-5 space-y-4">
        {entries.length === 0 ? (
          <p className="text-sm text-slate-500">No data available.</p>
        ) : entries.map(([label, value]) => (
          <div key={label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="capitalize text-slate-700">{label.replaceAll("_", " ")}</span>
              <span className="font-semibold text-slate-600">{value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-600"
                style={{ width: `${Math.max(5, (value / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getStoredUser());
  const [summary, setSummary] = useState(emptySummary);
  const [taskDistribution, setTaskDistribution] = useState({});
  const [priorityDistribution, setPriorityDistribution] = useState({});
  const [approvalSummary, setApprovalSummary] = useState({});
  const [recentActivity, setRecentActivity] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [userNames, setUserNames] = useState({});
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
      const [
        meResponse,
        tasksResponse,
        summaryResponse,
        taskDistributionResponse,
        priorityDistributionResponse,
        approvalSummaryResponse,
        recentActivityResponse,
      ] = await Promise.all([
        api.get("/auth/me"),
        api.get("/tasks/"),
        api.get("/dashboard/summary"),
        api.get("/dashboard/task-distribution"),
        api.get("/dashboard/priority-distribution"),
        api.get("/dashboard/approval-summary"),
        api.get("/dashboard/recent-activity"),
      ]);

      saveUser(meResponse.data);
      setUser(meResponse.data);
      setTasks(tasksResponse.data);
      setSummary(summaryResponse.data);
      setTaskDistribution(taskDistributionResponse.data);
      setPriorityDistribution(priorityDistributionResponse.data);
      setApprovalSummary(approvalSummaryResponse.data);
      setRecentActivity(recentActivityResponse.data);

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
    void loadDashboard();
  }, [loadDashboard]);

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
        comment: "Status updated from dashboard",
      });
      setTasks((current) => current.map((task) => (task.id === taskId ? response.data : task)));
      setMessage("Task status updated.");
      await loadDashboard();
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
      await loadDashboard();
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
      await loadDashboard();
    } catch (err) {
      setError(err.response?.status === 403 ? "You do not have permission to delete this task." : getApiError(err));
    }
  }

  return (
    <AppLayout user={user}>
      <section className="dashboard-header">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-indigo-700">Workflow overview</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Welcome back, {user?.name || "team member"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Track tasks, workflow stages, approvals, comments, and recent updates from one role-aware dashboard.
          </p>
          <span className="mt-4 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold capitalize text-indigo-700 ring-1 ring-indigo-200">
            {user?.role || "user"}
          </span>
        </div>
        {canCreateTasks(user) && (
          <Link className="btn-primary" to="/tasks/create">Create Task</Link>
        )}
      </section>

      {error && <Alert className="mt-4">{error}</Alert>}
      {message && <Alert className="mt-4" type="success">{message}</Alert>}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Workflow summary">
        <StatCard label="Total tasks" value={summary.total_tasks} tone="indigo" icon="total" />
        <StatCard label="Todo" value={summary.todo_tasks} tone="blue" icon="todo" />
        <StatCard label="In progress" value={summary.in_progress_tasks} tone="amber" icon="progress" />
        <StatCard label="Review" value={summary.review_tasks} tone="violet" icon="review" />
        <StatCard label="Completed" value={summary.completed_tasks} tone="green" icon="done" />
        <StatCard label="Pending approvals" value={summary.pending_approvals} tone="amber" icon="progress" />
        <StatCard label="Total comments" value={summary.total_comments} tone="blue" icon="total" />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-3">
        <DistributionBars title="Task distribution" data={taskDistribution} />
        <DistributionBars title="Priority distribution" data={priorityDistribution} />
        <DistributionBars title="Approval summary" data={approvalSummary} />
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
          <button className="btn-secondary" type="button" onClick={loadDashboard}>Refresh</button>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <LoadingSpinner label="Loading dashboard..." />
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
        </div>

        <aside className="h-fit lg:sticky lg:top-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">Recent Activity</h2>
            <div className="mt-5 space-y-4">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-slate-500">No recent activity yet.</p>
              ) : recentActivity.map((item, index) => (
                <article className="border-l-2 border-indigo-200 pl-4" key={`${item.type}-${item.created_at}-${index}`}>
                  <p className="text-sm font-semibold text-slate-950">{item.message}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.type.replaceAll("_", " ")} | User #{item.user_id} | {new Date(item.created_at).toLocaleString()}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </AppLayout>
  );
}
