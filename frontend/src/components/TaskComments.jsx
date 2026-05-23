import { useEffect, useState } from "react";

import api, { getApiError } from "../api/axios";
import Alert from "./Alert";
import LoadingSpinner from "./LoadingSpinner";

export default function TaskComments({ taskId, user }) {
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const canUseInternal = user?.role === "admin" || user?.role === "manager";

  async function loadComments() {
    setError("");
    setLoading(true);
    try {
      const response = await api.get(`/tasks/${taskId}/comments`);
      setComments(response.data);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  async function submitComment(event) {
    event.preventDefault();
    if (!content.trim()) {
      setError("Comment content cannot be empty");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await api.post(`/tasks/${taskId}/comments`, {
        content,
        is_internal: canUseInternal ? isInternal : false,
      });
      setComments((current) => [...current, response.data]);
      setContent("");
      setIsInternal(false);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">Comments</h2>
      {error && <Alert className="mt-3">{error}</Alert>}
      <form className="mt-4 space-y-3" onSubmit={submitComment}>
        <textarea className="input min-h-24" value={content} onChange={(event) => setContent(event.target.value)} placeholder="Add a comment" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {canUseInternal ? (
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input checked={isInternal} type="checkbox" onChange={(event) => setIsInternal(event.target.checked)} />
              Internal note
            </label>
          ) : (
            <p className="text-sm text-slate-500">Employees can add public comments only.</p>
          )}
          <button className="btn-primary" disabled={saving} type="submit">{saving ? "Adding..." : "Add Comment"}</button>
        </div>
      </form>
      <div className="mt-5 space-y-3">
        {loading ? <LoadingSpinner label="Loading comments..." /> : comments.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500">No comments yet.</p>
        ) : comments.map((comment) => (
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-3" key={comment.id}>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="text-sm font-semibold text-slate-900">User #{comment.user_id}</span>
              {comment.is_internal && <span className="badge bg-violet-50 text-violet-700 ring-1 ring-violet-200">Internal</span>}
              {new Date(comment.created_at).toLocaleString()}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-700">{comment.content}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
