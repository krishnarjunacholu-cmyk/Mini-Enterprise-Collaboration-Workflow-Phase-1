import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api, { getApiError } from "../api/axios";
import Alert from "../components/Alert";
import AppLayout from "../components/AppLayout";
import ApprovalStatusBadge from "../components/ApprovalStatusBadge";
import LoadingSpinner from "../components/LoadingSpinner";
import { getStoredUser, saveUser } from "../utils/auth";

function canAct(user, approval) {
  if (user?.role === "manager") return approval.current_level === "manager";
  if (user?.role === "admin") return approval.current_level === "admin";
  return false;
}

const approvalCardStyles = {
  pending: "border-slate-200 bg-white",
  manager_approved: "border-slate-200 bg-white",
  admin_approved: "border-slate-200 bg-white",
  rejected: "border-slate-200 bg-white",
  hold: "border-slate-200 bg-white",
};

export default function Approvals() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getStoredUser());
  const [approvals, setApprovals] = useState([]);
  const [actionState, setActionState] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadApprovals = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const [meResponse, approvalsResponse] = await Promise.all([
        api.get("/auth/me"),
        api.get("/approvals/"),
      ]);
      saveUser(meResponse.data);
      setUser(meResponse.data);
      setApprovals(approvalsResponse.data);
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
    void loadApprovals();
  }, [loadApprovals]);

  const visibleActions = useMemo(() => approvals.filter((approval) => canAct(user, approval)).length, [approvals, user]);

  function updateActionState(approvalId, field, value) {
    setActionState((current) => ({
      ...current,
      [approvalId]: {
        action: "approve",
        comment: "",
        ...(current[approvalId] || {}),
        [field]: value,
      },
    }));
  }

  async function submitAction(approvalId) {
    const data = actionState[approvalId] || { action: "approve", comment: "" };
    if (data.action === "reject" && !data.comment.trim()) {
      setError("Rejection requires a comment");
      return;
    }

    setSavingId(approvalId);
    setError("");
    setMessage("");
    try {
      await api.patch(`/approvals/${approvalId}/action`, {
        action: data.action,
        comment: data.comment || null,
      });
      setMessage("Approval action saved.");
      await loadApprovals();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <AppLayout user={user}>
      <section className="dashboard-header">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-indigo-700">Approval workflow</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Approvals</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Track employee requests through manager review and admin final approval.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="text-sm font-semibold text-slate-500">{visibleActions} waiting for your action</span>
          <Link className="btn-primary" to="/approvals/create">Create Approval</Link>
        </div>
      </section>

      {error && <Alert className="mt-4">{error}</Alert>}
      {message && <Alert className="mt-4" type="success">{message}</Alert>}

      <section className="mt-6 space-y-4">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <LoadingSpinner label="Loading approvals..." />
          </div>
        ) : approvals.length === 0 ? (
          <div className="empty-state">
            <h2 className="text-lg font-semibold text-slate-950">No approval requests</h2>
            <p className="mt-2 text-sm text-slate-600">Create an approval request to start the workflow.</p>
          </div>
        ) : approvals.map((approval) => {
          const state = actionState[approval.id] || { action: "approve", comment: "" };
          return (
            <article
              className={`rounded-2xl border p-5 shadow-sm ${approvalCardStyles[approval.status] || "border-slate-200 bg-white"}`}
              key={approval.id}
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-950">{approval.title}</h2>
                    <ApprovalStatusBadge status={approval.status} />
                    <span className="badge bg-slate-100 capitalize text-slate-700">{approval.current_level}</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{approval.description || "No description provided."}</p>
                  <p className="mt-4 text-xs text-slate-500">
                    Requested by User #{approval.requested_by_id} | {new Date(approval.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col gap-3 sm:flex-row xl:flex-col">
                  <Link className="btn-secondary" to={`/approvals/${approval.id}/history`}>
                    View History
                  </Link>
                </div>
              </div>

              {canAct(user, approval) && (
                <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 lg:grid-cols-[160px_1fr_auto]">
                  <select
                    className="input"
                    value={state.action}
                    onChange={(event) => updateActionState(approval.id, "action", event.target.value)}
                  >
                    <option value="approve">approve</option>
                    <option value="reject">reject</option>
                    <option value="hold">hold</option>
                  </select>
                  <input
                    className="input"
                    placeholder={state.action === "reject" ? "Comment required for rejection" : "Comment optional"}
                    value={state.comment}
                    onChange={(event) => updateActionState(approval.id, "comment", event.target.value)}
                  />
                  <button
                    className="btn-primary"
                    disabled={savingId === approval.id}
                    type="button"
                    onClick={() => submitAction(approval.id)}
                  >
                    {savingId === approval.id ? "Saving..." : "Submit Action"}
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </section>
    </AppLayout>
  );
}
