"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function SignupForm() {
  const params      = useSearchParams();
  const router      = useRouter();
  const sessionId   = params.get("session_id");
  const plan        = params.get("plan");

  const [email,     setEmail]     = useState("");
  const [name,      setName]      = useState("");
  const [password,  setPassword]  = useState("");
  const [loading,   setLoading]   = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [verified,  setVerified]  = useState(false);
  const [error,     setError]     = useState("");

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
        if (data.name)  setName(data.name);
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
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#C5FF3D] border-t-transparent" />
          <p className="font-mono text-sm text-[#8A8A8A]">Verifying payment...</p>
        </div>
      </div>
    );
  }

  if (!sessionId || !verified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-6">
        <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <p className="font-bold text-red-400">Payment verification failed</p>
          <p className="mt-2 text-sm text-red-300">{error || "No valid payment session found."}</p>
          <a href="/#pricing" className="mt-5 inline-block font-mono text-xs text-[#C5FF3D] underline">
            ← Back to pricing
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <a href="/" className="text-lg font-bold">
            Crawler Que<span className="text-[#C5FF3D]"> by Strat IQ Digital</span>
          </a>
          <div className="mt-3 inline-flex rounded-full border border-[#C5FF3D]/30 px-4 py-1 font-mono text-xs text-[#C5FF3D]">
            ✓ Payment confirmed · {plan} plan
          </div>
        </div>

        <div className="rounded-2xl border border-[#C5FF3D]/25 bg-[#0d1500] p-8">
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="mt-2 text-sm text-[#8A8A8A]">
            Your subscription is active. Set a password to access your dashboard.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block font-mono text-xs uppercase tracking-wider text-[#8A8A8A]">
                Full Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-[#2a2a2a] bg-[#0A0A0A] px-4 py-3 text-sm text-white outline-none focus:border-[#C5FF3D]/60"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="mb-1 block font-mono text-xs uppercase tracking-wider text-[#8A8A8A]">
                Email
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                className="w-full rounded-lg border border-[#2a2a2a] bg-[#0A0A0A] px-4 py-3 text-sm text-white outline-none focus:border-[#C5FF3D]/60"
                placeholder="you@youragency.com"
              />
            </div>

            <div>
              <label className="mb-1 block font-mono text-xs uppercase tracking-wider text-[#8A8A8A]">
                Password
              </label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
                minLength={8}
                className="w-full rounded-lg border border-[#2a2a2a] bg-[#0A0A0A] px-4 py-3 text-sm text-white outline-none focus:border-[#C5FF3D]/60"
                placeholder="Minimum 8 characters"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#C5FF3D] px-5 py-3 font-mono text-sm font-bold uppercase tracking-wider text-black disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create account & go to dashboard →"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center font-mono text-xs text-[#444]">
          Already have an account?{" "}
          <a href="/login" className="text-[#C5FF3D]">Log in</a>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C5FF3D] border-t-transparent" />
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}