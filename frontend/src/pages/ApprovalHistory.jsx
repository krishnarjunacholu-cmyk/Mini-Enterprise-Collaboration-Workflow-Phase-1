import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import api, { getApiError } from "../api/axios";
import Alert from "../components/Alert";
import AppLayout from "../components/AppLayout";
import LoadingSpinner from "../components/LoadingSpinner";
import { getStoredUser, saveUser } from "../utils/auth";

export default function ApprovalHistory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(getStoredUser());
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadHistory() {
      setError("");
      setLoading(true);
      try {
        const [meResponse, historyResponse] = await Promise.all([
          api.get("/auth/me"),
          api.get(`/approvals/${id}/history`),
        ]);
        saveUser(meResponse.data);
        setUser(meResponse.data);
        setHistory(historyResponse.data);
      } catch (err) {
        setError(getApiError(err));
        if (err.response?.status === 401) navigate("/login");
      } finally {
        setLoading(false);
      }
    }

    void loadHistory();
  }, [id, navigate]);

  return (
    <AppLayout user={user}>
      <section className="dashboard-header">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-indigo-700">Approval audit trail</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Approval History
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Review every submitted, approved, rejected, or held action for this approval.
          </p>
        </div>
        <Link className="btn-secondary" to="/approvals">Back to Approvals</Link>
      </section>

      {error && <Alert className="mt-4">{error}</Alert>}

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {loading ? (
          <LoadingSpinner label="Loading approval history..." />
        ) : history.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            No history recorded yet.
          </p>
        ) : (
          <div className="space-y-4">
            {history.map((item) => (
              <article className="border-l-2 border-indigo-200 pl-4" key={item.id}>
                <p className="text-sm font-semibold capitalize text-slate-950">
                  {item.action.replaceAll("_", " ")}
                </p>
                <p className="mt-1 text-sm text-slate-600">{item.comment || "No comment provided."}</p>
                <p className="mt-1 text-xs text-slate-500">
                  User #{item.action_by_id} | {new Date(item.created_at).toLocaleString()}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppLayout>
  );
}
