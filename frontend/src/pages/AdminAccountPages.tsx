import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { apiRequest } from "../api/apiClient";

type AccountFormProps = { title: string; description: string };

function AccountFrame({ title, description, children }: AccountFormProps & { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 text-slate-900">
      <section className="w-full max-w-lg space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <header>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-violet-700">Qiosk Manager</p>
          <h1 className="mt-2 text-2xl font-bold">{title}</h1>
          <p className="mt-2 text-sm text-slate-600">{description}</p>
        </header>
        {children}
      </section>
    </main>
  );
}

function AccountMessages({ error, success }: { error: string; success: string }) {
  return (
    <>
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
      {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</p>}
    </>
  );
}

export function InitialSetupPage() {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void apiRequest<{ available: boolean }>("/auth/setup/")
      .then((result) => {
        if (active) setAvailable(result.available);
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Unable to check setup status.");
      });
    return () => {
      active = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await apiRequest("/auth/setup/", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      window.location.assign("/admin");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to complete setup.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountFrame title="Set up your restaurant" description="Create the first owner account and restaurant. This setup is permanently disabled after the first account is created.">
      <AccountMessages error={error} success="" />
      {available === false ? (
        <div className="space-y-4">
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">Initial setup is already complete. Ask a restaurant owner to invite you.</p>
          <Link className="font-semibold text-violet-700 hover:underline" to="/admin/login">Go to staff sign in</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {[
            ["username", "Username", "text"],
            ["email", "Email", "email"],
            ["restaurant_name", "Restaurant name", "text"],
            ["phone_number", "Phone number", "tel"],
            ["address", "Restaurant address", "text"],
            ["password", "Password", "password"],
            ["password_confirm", "Confirm password", "password"],
          ].map(([name, label, type]) => (
            <label key={name} className="block text-sm font-semibold text-slate-700">
              {label}
              {name === "address" ? (
                <textarea name={name} required rows={2} className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" />
              ) : (
                <input name={name} type={type} required={name !== "phone_number"} maxLength={name === "phone_number" ? 10 : undefined} autoComplete={name.includes("password") ? "new-password" : undefined} className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" />
              )}
            </label>
          ))}
          <button type="submit" disabled={busy || available === null} className="w-full rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
            {busy ? "Creating account…" : "Create owner account"}
          </button>
        </form>
      )}
    </AccountFrame>
  );
}

export function InvitationAcceptPage() {
  const { token = "" } = useParams();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await apiRequest<{ detail: string }>("/auth/invitations/accept/", {
        method: "POST",
        body: JSON.stringify({
          token,
          password: form.get("password"),
          password_confirm: form.get("password_confirm"),
        }),
      });
      setSuccess(result.detail);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to accept invitation.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountFrame title="Set your staff password" description="Choose a password to activate your restaurant account. Invitation links are single-use and expire after 24 hours.">
      <AccountMessages error={error} success={success} />
      {!success && (
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-semibold text-slate-700">
            New password
            <input name="password" type="password" required autoComplete="new-password" className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Confirm password
            <input name="password_confirm" type="password" required autoComplete="new-password" className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" />
          </label>
          <button type="submit" disabled={busy} className="w-full rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
            {busy ? "Activating…" : "Set password"}
          </button>
        </form>
      )}
      {success && <Link to="/admin/login" className="font-semibold text-violet-700 hover:underline">Go to sign in</Link>}
    </AccountFrame>
  );
}

export function PasswordResetRequestPage() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await apiRequest<{ detail: string }>("/auth/password/reset/", {
        method: "POST",
        body: JSON.stringify({ email: form.get("email") }),
      });
      setSuccess(result.detail);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to request a password reset.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountFrame title="Reset your password" description="Enter your account email. If it matches an active account, reset instructions will be sent.">
      <AccountMessages error={error} success={success} />
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-semibold text-slate-700">
          Email
          <input name="email" type="email" required autoComplete="email" className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" />
        </label>
        <button type="submit" disabled={busy} className="w-full rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
          {busy ? "Sending…" : "Send reset instructions"}
        </button>
      </form>
      <Link to="/admin/login" className="text-sm font-semibold text-violet-700 hover:underline">Back to sign in</Link>
    </AccountFrame>
  );
}

export function PasswordResetConfirmPage() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await apiRequest<{ detail: string }>("/auth/password/reset/confirm/", {
        method: "POST",
        body: JSON.stringify({
          uid: searchParams.get("uid"),
          token: searchParams.get("token"),
          password: form.get("password"),
          password_confirm: form.get("password_confirm"),
        }),
      });
      setSuccess(result.detail);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to reset the password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountFrame title="Choose a new password" description="Reset links expire and can be used only once.">
      <AccountMessages error={error} success={success} />
      {!success && (
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-semibold text-slate-700">
            New password
            <input name="password" type="password" required autoComplete="new-password" className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Confirm password
            <input name="password_confirm" type="password" required autoComplete="new-password" className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" />
          </label>
          <button type="submit" disabled={busy} className="w-full rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
            {busy ? "Resetting…" : "Reset password"}
          </button>
        </form>
      )}
      {success && <Link to="/admin/login" className="font-semibold text-violet-700 hover:underline">Go to sign in</Link>}
    </AccountFrame>
  );
}

export function PasswordChangePage() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const formElement = event.currentTarget;
    const form = new FormData(event.currentTarget);
    try {
      const result = await apiRequest<{ detail: string }>("/auth/password/change/", {
        method: "POST",
        body: JSON.stringify({
          current_password: form.get("current_password"),
          password: form.get("password"),
          password_confirm: form.get("password_confirm"),
        }),
      });
      setSuccess(result.detail);
      formElement.reset();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to change password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-wide text-violet-700">Account security</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Change password</h1>
      </header>
      <AccountMessages error={error} success={success} />
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {[
          ["current_password", "Current password", "current-password"],
          ["password", "New password", "new-password"],
          ["password_confirm", "Confirm new password", "new-password"],
        ].map(([name, label, autocomplete]) => (
          <label key={name} className="block text-sm font-semibold text-slate-700">
            {label}
            <input name={name} type="password" required autoComplete={autocomplete} className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" />
          </label>
        ))}
        <button type="submit" disabled={busy} className="rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
          {busy ? "Saving…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
