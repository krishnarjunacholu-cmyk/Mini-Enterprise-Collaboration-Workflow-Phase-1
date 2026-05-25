import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api, { getApiError } from "../api/axios";
import Alert from "../components/Alert";
import AppLayout from "../components/AppLayout";
import LoadingSpinner from "../components/LoadingSpinner";
import StatCard from "../components/StatCard";
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
  const [message] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setError("");
    setLoading(true);

    try {
      const [
        meResponse,
        summaryResponse,
        taskDistributionResponse,
        priorityDistributionResponse,
        approvalSummaryResponse,
        recentActivityResponse,
      ] = await Promise.all([
        api.get("/auth/me"),
        api.get("/dashboard/summary"),
        api.get("/dashboard/task-distribution"),
        api.get("/dashboard/priority-distribution"),
        api.get("/dashboard/approval-summary"),
        api.get("/dashboard/recent-activity"),
      ]);

      saveUser(meResponse.data);
      setUser(meResponse.data);
      setSummary(summaryResponse.data);
      setTaskDistribution(taskDistributionResponse.data);
      setPriorityDistribution(priorityDistributionResponse.data);
      setApprovalSummary(approvalSummaryResponse.data);
      setRecentActivity(recentActivityResponse.data);
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

      <section className="mt-6 space-y-6">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <LoadingSpinner label="Loading dashboard..." />
          </div>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Dashboard Actions</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Open the dedicated task list or Kanban board to manage workflow items.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link className="btn-secondary" to="/tasks">
                  View Tasks
                </Link>
                <Link className="btn-secondary" to="/kanban">
                  Open Kanban
                </Link>
              </div>
            </div>
          </section>
        )}

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
      </section>
    </AppLayout>
  );
}
