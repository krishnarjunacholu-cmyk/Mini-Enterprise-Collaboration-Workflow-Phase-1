import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api, { getApiError } from "../api/axios";
import { getToken } from "../utils/auth";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "employee",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submitRegister(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await api.post("/auth/register", form);
      setSuccess("Registration successful. Redirecting to login...");
      setTimeout(() => navigate("/login"), 900);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">Create account</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">Register a project user</h1>
          <p className="mt-2 text-sm text-slate-600">
            Choose the role that matches the user permission level.
          </p>
        </div>

        {error && <div className="notice-error mb-4">{error}</div>}
        {success && <div className="notice-success mb-4">{success}</div>}

        <form className="space-y-4" onSubmit={submitRegister}>
          <div>
            <label className="field-label" htmlFor="name">
              Name
            </label>
            <input className="input" id="name" name="name" value={form.name} onChange={updateField} required />
          </div>

          <div>
            <label className="field-label" htmlFor="email">
              Email
            </label>
            <input className="input" id="email" name="email" type="email" value={form.email} onChange={updateField} required />
          </div>

          <div>
            <label className="field-label" htmlFor="password">
              Password
            </label>
            <input className="input" id="password" name="password" type="password" minLength="6" maxLength="72" value={form.password} onChange={updateField} required />
          </div>

          <div>
            <label className="field-label" htmlFor="role">
              Role
            </label>
            <select className="input" id="role" name="role" value={form.role} onChange={updateField}>
              <option value="admin">admin</option>
              <option value="manager">manager</option>
              <option value="employee">employee</option>
            </select>
          </div>

          <button className="btn-primary w-full" type="submit" disabled={loading}>
            {loading ? "Creating..." : "Register"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link className="font-medium text-indigo-600 hover:text-indigo-700" to="/login">
            Login
          </Link>
        </p>
      </section>
    </main>
  );
}
