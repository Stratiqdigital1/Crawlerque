"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");

  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState("");

  // No token in URL — link is malformed or already used
  if (!token) {
    return (
      <div className="cq-card cq-frame p-8 text-center">
        <p className="text-lg font-bold text-[var(--cq-danger)]">Invalid reset link</p>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--cq-text-2)]">
          This password reset link is missing or invalid. Request a new one below.
        </p>
        <a href="/forgot-password" className="cq-btn cq-btn--primary mt-6 w-full">
          Request new link
        </a>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.error || "This link may have expired. Please request a new one.");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="cq-card cq-frame p-8 text-center">
        <p className="cq-eyebrow cq-eyebrow--signal">Done</p>
        <h1 className="mt-2 text-2xl font-bold">Password updated</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--cq-text-2)]">
          Redirecting you to login…
        </p>
      </div>
    );
  }

  return (
    <div className="cq-card cq-frame p-8">
      <p className="cq-eyebrow cq-eyebrow--signal">Account recovery</p>
      <h1 className="mt-2 text-3xl font-bold">Set a new password</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-[var(--cq-text-2)]">
        Choose a new password for your account.
      </p>

      <form onSubmit={handleSubmit} className="mt-7 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--cq-text-2)]">
            New password
          </label>
          <input
            type="password"
            placeholder="Minimum 8 characters"
            className="cq-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--cq-text-2)]">
            Confirm password
          </label>
          <input
            type="password"
            placeholder="Re-enter password"
            className="cq-input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            required
          />
        </div>

        {error && (
          <div className="rounded-lg border border-[var(--cq-danger)]/30 bg-[var(--cq-danger)]/10 px-4 py-3 text-sm text-[var(--cq-danger)]">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="cq-btn cq-btn--primary w-full"
        >
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--cq-ink)] px-6 py-16">
      <div className="w-full max-w-md">
        <a href="/" className="mb-10 flex items-center justify-center gap-3">
          <span className="cq-frame flex h-9 w-9 items-center justify-center bg-[var(--cq-surface)]">
            <span className="font-mono text-xs font-bold text-[var(--cq-signal)]">CQ</span>
          </span>
          <span className="font-[var(--font-space)] text-xl font-bold tracking-tight text-[var(--cq-text)]">
            Crawler Que
          </span>
        </a>

        <Suspense
          fallback={
            <div className="cq-card cq-frame p-8">
              <div className="cq-scanline" />
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}