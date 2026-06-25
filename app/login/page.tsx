"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();

      if (!json?.success) {
        setError(json?.error || "Login failed. Check your email and password.");
        return;
      }

      if (json?.user?.role === "admin") {
        window.location.assign("/admin");
      } else {
        window.location.assign("/dashboard");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--cq-ink)] px-6 py-16">
      <div className="w-full max-w-md">
        {/* Wordmark */}
<a href="/" className="mb-10 flex items-center justify-center">
          <img src="/logo-full.png" alt="Crawler Que" className="h-9 w-auto" />
        </a>

        {/* Console card */}
        <div className="cq-card cq-frame p-8">
          <p className="cq-eyebrow cq-eyebrow--signal">Operator access</p>
          <h1 className="mt-2 text-3xl font-bold">Log in</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-[var(--cq-text-2)]">
            Pick up where your last audit left off.
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
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--cq-text-2)]">
                Password
              </label>
              <input
                type="password"
                placeholder="Your password"
                className="cq-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>

            {error && (
              <div className="rounded-lg border border-[var(--cq-danger)]/30 bg-[var(--cq-danger)]/10 px-4 py-3 text-sm text-[var(--cq-danger)]">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleLogin}
              disabled={loading}
              className="cq-btn cq-btn--primary w-full"
            >
              {loading ? "Logging in…" : "Log in"}
            </button>

            {/* Crawl line — alive while the console waits */}
            <div className="cq-scanline" />

            <a
              href="/forgot-password"
              className="block text-center text-sm text-[var(--cq-text-2)] underline-offset-4 hover:text-[var(--cq-signal)] hover:underline"
            >
              Forgot password?
            </a>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-[var(--cq-text-3)]">
          New here?{" "}
          <a href="/#pricing" className="text-[var(--cq-signal)] hover:underline">
            Choose a plan
          </a>{" "}
          to create an account.
        </p>
      </div>
    </main>
  );
}