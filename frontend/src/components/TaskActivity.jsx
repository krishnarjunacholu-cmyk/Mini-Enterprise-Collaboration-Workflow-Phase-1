import { useEffect, useState } from "react";

import api, { getApiError } from "../api/axios";
import Alert from "./Alert";
import LoadingSpinner from "./LoadingSpinner";

export default function TaskActivity({ taskId }) {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadActivity() {
    setError("");
    setLoading(true);
    try {
      const response = await api.get(`/tasks/${taskId}/activity`);
      setActivity(response.data);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">Activity</h2>
      {error && <Alert className="mt-3">{error}</Alert>}
      <div className="mt-5 space-y-3">
        {loading ? <LoadingSpinner label="Loading activity..." /> : activity.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500">No activity yet.</p>
        ) : activity.map((item) => (
          <article className="border-l-2 border-indigo-200 pl-3" key={item.id}>
            <p className="text-sm font-semibold capitalize text-slate-950">{item.action.replaceAll("_", " ")}</p>
            <p className="mt-1 text-sm text-slate-600">{item.details || "No details provided."}</p>
            <p className="mt-1 text-xs text-slate-500">User #{item.user_id} | {new Date(item.created_at).toLocaleString()}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
