"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function SignupForm() {
  const params = useSearchParams();
  const router = useRouter();
  const sessionId = params.get("session_id");
  const plan = params.get("plan");

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");

  // Verify the Stripe session is real and paid before showing the form
  useEffect(() => {
    if (!sessionId) { setVerifying(false); return; }

    fetch("/api/stripe/verify-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.email) setEmail(data.email);
        if (data.name) setName(data.name);
        setVerified(data.paid === true);
        if (!data.paid) setError("Payment not confirmed. Please try again or contact support.");
      })
      .catch(() => setError("Could not verify payment. Please contact support."))
      .finally(() => setVerifying(false));
  }, [sessionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password, sessionId, plan }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Registration failed");
      router.replace("/dashboard");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cq-ink)]">
        <div className="w-64 text-center">
          <p className="text-sm text-[var(--cq-text-2)]">Verifying payment…</p>
          <div className="cq-scanline mt-4" />
        </div>
      </div>
    );
  }

  if (!sessionId || !verified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cq-ink)] px-6">
        <div className="cq-card w-full max-w-md border-[var(--cq-danger)]/30 p-8 text-center">
          <p className="text-lg font-bold text-[var(--cq-danger)]">Payment verification failed</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--cq-text-2)]">
            {error || "No valid payment session found."}
          </p>
          <a href="/#pricing" className="cq-btn cq-btn--ghost mt-6 w-full">
            ← Back to pricing
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--cq-ink)] px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
<a href="/" className="inline-flex items-center justify-center">
            <img src="/logo-full.png" alt="Crawler Que" className="h-9 w-auto" />
          </a>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--cq-signal)]/30 bg-[var(--cq-signal)]/8 px-4 py-1.5 font-mono text-xs text-[var(--cq-signal)]">
            ✓ Payment confirmed · {plan} plan
          </div>
        </div>

        <div className="cq-card cq-frame p-8">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-[var(--cq-text-2)]">
            Your subscription is active. Set a password to open your dashboard.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--cq-text-2)]">
                Full name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="cq-input"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--cq-text-2)]">
                Email
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                className="cq-input"
                placeholder="you@youragency.com"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--cq-text-2)]">
                Password
              </label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
                minLength={8}
                className="cq-input"
                placeholder="Minimum 8 characters"
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
              {loading ? "Creating account…" : "Create account → dashboard"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-[var(--cq-text-3)]">
          Already have an account?{" "}
          <a href="/login" className="text-[var(--cq-signal)] hover:underline">Log in</a>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--cq-ink)]">
          <div className="cq-scanline w-64" />
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}