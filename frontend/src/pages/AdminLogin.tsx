import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

type RedirectState = {
  from?: {
    pathname?: string;
    search?: string;
    hash?: string;
  };
};

export default function AdminLogin() {
  const { login, status } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (status === "authenticated") {
    return <Navigate to="/admin" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(username.trim(), password);
      const redirectState = location.state as RedirectState | null;
      const from = redirectState?.from;
      const destination =
        from?.pathname?.startsWith("/admin") &&
        from.pathname !== "/admin/login"
          ? `${from.pathname}${from.search ?? ""}${from.hash ?? ""}`
          : "/admin";

      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to sign in. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canteen-login px-4 py-10 text-white">
      <section className="w-full max-w-md rounded-3xl border-2 border-white/20 bg-slate-950/85 p-8 shadow-2xl backdrop-blur-2xl sm:p-10">
        <div className="flex items-center justify-between">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-2xl font-black text-slate-950 shadow-lg shadow-amber-500/25">
            Q
          </div>
          <Link
            to="/"
            className="text-xs font-bold text-amber-400 hover:underline"
          >
            ← Back to Kiosk
          </Link>
        </div>

        <p className="mt-6 text-xs font-black uppercase tracking-widest text-amber-400">
          RV COLLEGE OF ENGINEERING CANTEEN OPERATIONS
        </p>
        <h1 className="mt-1 text-3xl font-black text-white">
          Admin Sign In
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          Sign in with your staff account to access POS, kitchen display, inventory, and reports.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="username"
              className="text-sm font-bold text-slate-200"
            >
              Username
            </label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-2 w-full rounded-2xl border-2 border-white/20 bg-slate-900/90 px-4 py-3.5 text-base font-bold text-white outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="text-sm font-bold text-slate-200"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-2xl border-2 border-white/20 bg-slate-900/90 px-4 py-3.5 text-base font-bold text-white outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-2xl border border-rose-500 bg-rose-950/80 p-4 text-sm font-bold text-rose-300"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 py-4 text-lg font-black text-slate-950 shadow-xl shadow-amber-500/25 transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Signing in..." : "Sign in to Dashboard →"}
          </button>
        </form>

        <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm">
          <Link to="/admin/password-reset" className="font-bold text-amber-400 hover:underline">
            Forgot password?
          </Link>
<<<<<<< HEAD
          <Link to="/admin/setup" className="font-semibold text-violet-700 hover:underline">
            Create an owner account
=======
          <Link to="/admin/setup" className="font-bold text-amber-400 hover:underline">
            Initial setup
>>>>>>> 89d3e54 (Save my local changes)
          </Link>
        </div>

        <p className="mt-8 text-center text-xs text-slate-400 border-t border-white/10 pt-4">
          Customer?{" "}
          <Link
            to="/order"
            className="font-bold text-amber-300 hover:underline"
          >
            Go to Customer Kiosk Ordering
          </Link>
        </p>
      </section>
    </main>
  );
}
