"use client";

import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16">
      <div className="mx-auto max-w-md rounded-2xl border bg-white p-8 shadow-sm">

        <h1 className="text-2xl font-bold text-slate-950">
          Forgot Password
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Enter your email address to reset your password.
        </p>

        <div className="mt-6 space-y-4">

          <input
            type="email"
            placeholder="Email address"
            className="w-full rounded-xl border px-4 py-3 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <button
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
          >
            Send Reset Link
          </button>

          <a
            href="/login"
            className="block text-center text-sm font-semibold text-slate-600"
          >
            Back to login
          </a>

        </div>
      </div>
    </main>
  );
}