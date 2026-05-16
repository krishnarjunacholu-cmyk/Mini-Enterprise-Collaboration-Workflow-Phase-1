import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api, { getApiError } from "../api/axios";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { canCreateTasks, getStoredUser, saveUser } from "../utils/auth";

const initialForm = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  due_date: "",
  assigned_to_id: "",
};

export default function CreateTask() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getStoredUser());
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/auth/me").then((response) => {
      saveUser(response.data);
      setUser(response.data);
    });
  }, []);

  const canCreate = canCreateTasks(user);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submitTask(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const payload = {
      title: form.title,
      description: form.description || null,
      status: form.status,
      priority: form.priority,
      due_date: form.due_date || null,
      assigned_to_id: form.assigned_to_id ? Number(form.assigned_to_id) : null,
    };

    try {
      await api.post("/tasks/", payload);
      navigate("/dashboard");
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar user={user} />
      <Navbar user={user} />

      <main className="px-4 py-6 lg:ml-72 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6">
            <p className="text-sm font-medium uppercase tracking-wide text-indigo-700">Task management</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950">Create Task</h1>
            <p className="mt-2 text-sm text-slate-600">
              Admins and managers can create tasks and optionally assign them to a user id.
            </p>
          </div>

          {!canCreate ? (
            <div className="notice-error">Access denied. Employees cannot create tasks.</div>
          ) : (
            <form className="form-panel" onSubmit={submitTask}>
              {error && <div className="notice-error">{error}</div>}
              <TaskFields form={form} onChange={updateField} />
              <div className="flex flex-col gap-2 sm:flex-row">
                <button className="btn-primary" type="submit" disabled={loading}>
                  {loading ? "Creating..." : "Create Task"}
                </button>
                <button className="btn-secondary" type="button" onClick={() => navigate("/dashboard")}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

function TaskFields({ form, onChange }) {
  return (
    <>
      <div>
        <label className="field-label" htmlFor="title">
          Title
        </label>
        <input className="input" id="title" name="title" value={form.title} onChange={onChange} required />
      </div>

      <div>
        <label className="field-label" htmlFor="description">
          Description
        </label>
        <textarea className="input min-h-24" id="description" name="description" value={form.description} onChange={onChange} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="status">
            Status
          </label>
          <select className="input" id="status" name="status" value={form.status} onChange={onChange}>
            <option value="todo">todo</option>
            <option value="in_progress">in_progress</option>
            <option value="done">done</option>
          </select>
        </div>

        <div>
          <label className="field-label" htmlFor="priority">
            Priority
          </label>
          <select className="input" id="priority" name="priority" value={form.priority} onChange={onChange}>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="due_date">
            Due date
          </label>
          <input className="input" id="due_date" name="due_date" type="datetime-local" value={form.due_date} onChange={onChange} />
        </div>

        <div>
          <label className="field-label" htmlFor="assigned_to_id">
            Assigned user id
          </label>
          <input className="input" id="assigned_to_id" name="assigned_to_id" type="number" min="1" value={form.assigned_to_id} onChange={onChange} />
        </div>
      </div>
    </>
  );
}
