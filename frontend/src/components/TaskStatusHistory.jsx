import { useEffect, useState } from "react";

import api, { getApiError } from "../api/axios";
import Alert from "./Alert";
import LoadingSpinner from "./LoadingSpinner";

export default function TaskStatusHistory({ taskId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadHistory() {
      setError("");
      setLoading(true);
      try {
        const response = await api.get(`/tasks/${taskId}/status-history`);
        setHistory(response.data);
      } catch (err) {
        setError(getApiError(err));
      } finally {
        setLoading(false);
      }
    }

    void loadHistory();
  }, [taskId]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">Status History</h2>
      {error && <Alert className="mt-3">{error}</Alert>}
      <div className="mt-5 space-y-3">
        {loading ? (
          <LoadingSpinner label="Loading status history..." />
        ) : history.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            No status changes recorded yet.
          </p>
        ) : (
          history.map((item) => (
            <article className="border-l-2 border-indigo-200 pl-3" key={item.id}>
              <p className="text-sm font-semibold text-slate-950">
                {item.old_status.replaceAll("_", " ")} → {item.new_status.replaceAll("_", " ")}
              </p>
              <p className="mt-1 text-sm text-slate-600">{item.comment || "No comment provided."}</p>
              <p className="mt-1 text-xs text-slate-500">
                User #{item.changed_by_id} | {new Date(item.created_at).toLocaleString()}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
