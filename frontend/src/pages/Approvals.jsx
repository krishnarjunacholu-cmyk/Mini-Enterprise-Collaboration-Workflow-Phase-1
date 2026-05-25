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
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const [actionComment, setActionComment] = useState("");

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

  async function submitAction(approval, action, commentValue = "") {
    const comment = commentValue.trim();
    if (action === "reject" && !comment.trim()) {
      setError("Rejection requires a comment");
      return;
    }

    const defaultComment =
      action === "approve"
        ? `Approved by ${user?.role || "user"}`
        : action === "hold"
          ? comment
          : comment;

    setSavingId(approval.id);
    setError("");
    setMessage("");
    try {
      await api.patch(`/approvals/${approval.id}/action`, {
        action,
        comment: defaultComment || null,
      });
      setMessage("Approval action saved.");
      setPendingAction(null);
      setActionComment("");
      await loadApprovals();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSavingId(null);
    }
  }

  function openActionModal(approval, action) {
    setError("");
    setPendingAction({ approval, action });
    setActionComment("");
  }

  function closeActionModal() {
    setPendingAction(null);
    setActionComment("");
  }

  async function confirmPendingAction() {
    if (!pendingAction) return;
    await submitAction(pendingAction.approval, pendingAction.action, actionComment);
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
        ) : approvals.map((approval) => (
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
                <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <button
                      className="inline-flex min-h-10 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={savingId === approval.id}
                      type="button"
                      onClick={() => submitAction(approval, "approve")}
                    >
                      {savingId === approval.id ? "Saving..." : "Approve"}
                    </button>
                    <button
                      className="inline-flex min-h-10 items-center justify-center rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={savingId === approval.id}
                      type="button"
                      onClick={() => openActionModal(approval, "reject")}
                    >
                      Reject
                    </button>
                    <button
                      className="inline-flex min-h-10 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 shadow-sm transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={savingId === approval.id}
                      type="button"
                      onClick={() => openActionModal(approval, "hold")}
                    >
                      Hold
                    </button>
                    <Link className="btn-secondary" to={`/approvals/${approval.id}/history`}>
                      View History
                    </Link>
                  </div>
                </div>
              )}
            </article>
        ))}
      </section>

      {pendingAction && (
        <div className="fixed inset-0 z-50">
          <button
            aria-label="Close approval action"
            className="absolute inset-0 bg-slate-950/30"
            type="button"
            onClick={closeActionModal}
          />
          <div className="absolute left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
              {pendingAction.action} approval
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">{pendingAction.approval.title}</h2>
            <p className="mt-2 text-sm text-slate-600">
              {pendingAction.action === "reject"
                ? "Add a rejection reason before submitting."
                : "Add an optional hold note before submitting."}
            </p>
            <textarea
              className="input mt-4 min-h-28"
              placeholder={pendingAction.action === "reject" ? "Rejection comment required" : "Hold comment optional"}
              value={actionComment}
              onChange={(event) => setActionComment(event.target.value)}
            />
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button className="btn-secondary" type="button" onClick={closeActionModal}>
                Cancel
              </button>
              <button
                className={
                  pendingAction.action === "reject"
                    ? "inline-flex min-h-10 items-center justify-center rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    : "inline-flex min-h-10 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 shadow-sm transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                }
                disabled={savingId === pendingAction.approval.id}
                type="button"
                onClick={confirmPendingAction}
              >
                {savingId === pendingAction.approval.id ? "Saving..." : pendingAction.action === "reject" ? "Reject Approval" : "Hold Approval"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
