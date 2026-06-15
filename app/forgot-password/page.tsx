"use client";

import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.error || "Something went wrong. Please try again.");
        return;
      }

      // Always show success, even if the email doesn't exist —
      // prevents leaking which emails are registered.
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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

        <div className="cq-card cq-frame p-8">
          {sent ? (
            <>
              <p className="cq-eyebrow cq-eyebrow--signal">Check your inbox</p>
              <h1 className="mt-2 text-3xl font-bold">Reset link sent</h1>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--cq-text-2)]">
                If an account exists for <span className="font-semibold text-[var(--cq-text)]">{email}</span>,
                we've sent a password reset link. It expires in 1 hour.
              </p>
              <a href="/login" className="cq-btn cq-btn--primary mt-6 w-full">
                Back to login
              </a>
            </>
          ) : (
            <>
              <p className="cq-eyebrow cq-eyebrow--signal">Account recovery</p>
              <h1 className="mt-2 text-3xl font-bold">Forgot password</h1>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--cq-text-2)]">
                Enter your email and we'll send you a link to reset your password.
              </p>

              <div className="mt-7 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--cq-text-2)]">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="you@youragency.com"
                    className="cq-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  />
                </div>

                {error && (
                  <div className="rounded-lg border border-[var(--cq-danger)]/30 bg-[var(--cq-danger)]/10 px-4 py-3 text-sm text-[var(--cq-danger)]">
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="cq-btn cq-btn--primary w-full"
                >
                  {loading ? "Sending…" : "Send reset link"}
                </button>

                
                  href="/login"
                  className="block text-center text-sm text-[var(--cq-text-2)] underline-offset-4 hover:text-[var(--cq-signal)] hover:underline"
                >
                  Back to login
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}