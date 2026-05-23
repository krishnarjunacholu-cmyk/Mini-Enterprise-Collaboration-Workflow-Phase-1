import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api, { getApiError } from "../api/axios";
import Alert from "../components/Alert";
import AppLayout from "../components/AppLayout";
import LoadingSpinner from "../components/LoadingSpinner";
import { getStoredUser, saveUser } from "../utils/auth";

export default function CreateApproval() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getStoredUser());
  const [form, setForm] = useState({ title: "", description: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await api.get("/auth/me");
        saveUser(response.data);
        setUser(response.data);
      } catch (err) {
        setError(getApiError(err));
        if (err.response?.status === 401) navigate("/login");
      } finally {
        setLoading(false);
      }
    }

    void loadUser();
  }, [navigate]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submitApproval(event) {
    event.preventDefault();
    setError("");
    if (!form.title.trim()) {
      setError("Approval title is required.");
      return;
    }

    setSaving(true);
    try {
      await api.post("/approvals/", {
        title: form.title,
        description: form.description || null,
      });
      navigate("/approvals");
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout user={user}>
      <div className="max-w-3xl">
        <div className="mb-6">
          <p className="text-sm font-medium uppercase tracking-wide text-indigo-700">Approval workflow</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">Create Approval</h1>
          <p className="mt-2 text-sm text-slate-600">
            Submit a request for manager review and admin final approval.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <LoadingSpinner label="Loading user..." />
          </div>
        ) : (
          <form className="form-panel" onSubmit={submitApproval}>
            {error && <Alert>{error}</Alert>}
            <div>
              <label className="field-label" htmlFor="title">Title</label>
              <input
                className="input"
                id="title"
                name="title"
                value={form.title}
                onChange={updateField}
                placeholder="Request for task completion approval"
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="description">Description</label>
              <textarea
                className="input min-h-32"
                id="description"
                name="description"
                value={form.description}
                onChange={updateField}
                placeholder="Please review and approve the completed work."
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button className="btn-primary" disabled={saving} type="submit">
                {saving ? "Submitting..." : "Submit Approval"}
              </button>
              <button className="btn-secondary" type="button" onClick={() => navigate("/approvals")}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
