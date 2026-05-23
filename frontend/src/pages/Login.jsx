import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api, { getApiError } from "../api/axios";
import { clearSession, getToken, saveSession } from "../utils/auth";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "krishnarjuna.admin@example.com",
    password: "AdminKrishnarjuna",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submitLogin(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const loginResponse = await api.post("/auth/login", form);
      localStorage.setItem("token", loginResponse.data.access_token);
      const meResponse = await api.get("/auth/me");
      saveSession(loginResponse.data.access_token, meResponse.data);
      navigate("/dashboard");
    } catch (err) {
      clearSession();
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-grid">
        <div className="hidden rounded-l-2xl bg-gradient-to-br from-indigo-600 via-sky-600 to-cyan-600 p-8 text-white md:block">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-100">Enterprise Collaboration</p>
          <h1 className="mt-5 text-3xl font-bold leading-tight">Plan work, assign ownership, and track progress.</h1>
          <p className="mt-4 text-sm leading-6 text-indigo-50">
            A secure role-based workspace for admins, managers, and employees to collaborate on tasks.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-indigo-50">
            <span className="rounded-xl bg-white/15 px-3 py-2 ring-1 ring-white/20">JWT authentication</span>
            <span className="rounded-xl bg-white/15 px-3 py-2 ring-1 ring-white/20">Role-based dashboards</span>
            <span className="rounded-xl bg-white/15 px-3 py-2 ring-1 ring-white/20">Task assignment workflow</span>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">Welcome back</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">Login to your workspace</h2>
            <p className="mt-2 text-sm text-slate-600">
              Manage tasks, assignments, and workflow updates from one secure dashboard.
            </p>
          </div>

          {error && <div className="notice-error mb-4">{error}</div>}

          <form className="space-y-4" onSubmit={submitLogin}>
            <div>
              <label className="field-label" htmlFor="email">
                Email
              </label>
              <input
                className="input"
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={updateField}
                required
              />
            </div>

            <div>
              <label className="field-label" htmlFor="password">
                Password
              </label>
              <input
                className="input"
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={updateField}
                required
              />
            </div>

            <button className="btn-primary w-full" type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-600">
            Need an account?{" "}
            <Link className="font-medium text-indigo-600 hover:text-indigo-700" to="/register">
              Register
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
