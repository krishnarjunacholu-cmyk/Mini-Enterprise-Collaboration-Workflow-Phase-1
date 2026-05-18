import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import api, { getApiError } from "../api/axios";
import Alert from "../components/Alert";
import AppLayout from "../components/AppLayout";
import LoadingSpinner from "../components/LoadingSpinner";
import { getStoredUser, saveUser } from "../utils/auth";

function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default function EditTask() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(getStoredUser());
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadTask() {
      setLoading(true);
      setError("");

      try {
        const [meResponse, taskResponse] = await Promise.all([
          api.get("/auth/me"),
          api.get(`/tasks/${id}`),
        ]);
        saveUser(meResponse.data);
        setUser(meResponse.data);
        setForm({
          title: taskResponse.data.title || "",
          description: taskResponse.data.description || "",
          status: taskResponse.data.status || "todo",
          priority: taskResponse.data.priority || "medium",
          due_date: toDateTimeLocal(taskResponse.data.due_date),
          assigned_to_id: taskResponse.data.assigned_to_id || "",
        });
      } catch (err) {
        setError(getApiError(err));
      } finally {
        setLoading(false);
      }
    }

    loadTask();
  }, [id]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submitUpdate(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    const isEmployee = user?.role === "employee";
    const payload = isEmployee
      ? { status: form.status }
      : {
          title: form.title,
          description: form.description || null,
          status: form.status,
          priority: form.priority,
          due_date: form.due_date || null,
          assigned_to_id: form.assigned_to_id ? Number(form.assigned_to_id) : null,
        };

    try {
      await api.put(`/tasks/${id}`, payload);
      setMessage("Task updated successfully.");
      setTimeout(() => navigate("/dashboard"), 700);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  }

  const isEmployee = user?.role === "employee";

  return (
    <AppLayout user={user}>
        <div className="max-w-3xl">
          <div className="mb-6">
            <p className="text-sm font-medium uppercase tracking-wide text-indigo-700">Task details</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950">Edit Task</h1>
            <p className="mt-2 text-sm text-slate-600">
              Employees can update only status. Admins and managers can edit the full task when permitted.
            </p>
          </div>

          {loading ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <LoadingSpinner label="Loading task..." />
            </div>
          ) : error && !form ? (
            <Alert>{error}</Alert>
          ) : (
          <form className="form-panel" onSubmit={submitUpdate}>
            {error && <Alert>{error}</Alert>}
            {message && <Alert type="success">{message}</Alert>}

            {!isEmployee && (
              <>
                <div>
                  <label className="field-label" htmlFor="title">
                    Title
                  </label>
                  <input className="input" id="title" name="title" value={form.title} onChange={updateField} required />
                </div>

                <div>
                  <label className="field-label" htmlFor="description">
                    Description
                  </label>
                  <textarea className="input min-h-24" id="description" name="description" value={form.description} onChange={updateField} />
                </div>
              </>
            )}

            <div>
              <label className="field-label" htmlFor="status">
                Status
              </label>
              <select className="input" id="status" name="status" value={form.status} onChange={updateField}>
                <option value="todo">todo</option>
                <option value="in_progress">in_progress</option>
                <option value="done">done</option>
              </select>
            </div>

            {!isEmployee && (
              <>
                <div>
                  <label className="field-label" htmlFor="priority">
                    Priority
                  </label>
                  <select className="input" id="priority" name="priority" value={form.priority} onChange={updateField}>
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="field-label" htmlFor="due_date">
                      Due date
                    </label>
                    <input className="input" id="due_date" name="due_date" type="datetime-local" value={form.due_date} onChange={updateField} />
                  </div>

                  <div>
                    <label className="field-label" htmlFor="assigned_to_id">
                      Assigned user id
                    </label>
                    <input className="input" id="assigned_to_id" name="assigned_to_id" type="number" min="1" value={form.assigned_to_id} onChange={updateField} />
                  </div>
                </div>
              </>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <button className="btn-primary" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button className="btn-secondary" type="button" onClick={() => navigate("/dashboard")}>
                Cancel
              </button>
            </div>
            </form>
          )}
        </div>
    </AppLayout>
  );
}
