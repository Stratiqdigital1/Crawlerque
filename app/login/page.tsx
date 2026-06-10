"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
  <main className="relative min-h-screen overflow-hidden bg-[#0A0A0A] px-6 py-16 text-white">
    <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(#222_1px,transparent_1px),linear-gradient(90deg,#222_1px,transparent_1px)] [background-size:56px_56px]" />
    <div className="absolute -right-40 -top-40 h-[650px] w-[650px] rounded-full bg-[#C5FF3D]/10 blur-3xl" />

    <div className="relative z-10 mx-auto max-w-md rounded-2xl border border-[#C5FF3D]/25 bg-[#0d1500] p-8 shadow-2xl">
      <a href="/" className="mb-8 block text-xl font-extrabold tracking-tight text-white">
        Crawler<span className="text-[#C5FF3D]"> Que</span>
      </a>

      <div className="mb-5 inline-flex items-center gap-2 rounded bg-[#C5FF3D]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#C5FF3D]">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#C5FF3D]" />
        AI Website Growth Intelligence
      </div>

      <div className="mb-6">
  <h1 className="text-3xl font-bold text-white">
    Crawler <span className="text-[#C5FF3D]">Que</span>
  </h1>

  <p className="mt-2 text-sm text-[#8A8A8A]">
  </p>
</div>

<h2 className="text-2xl font-bold text-white">
  Login
</h2>

      <p className="mt-2 text-sm leading-6 text-[#8A8A8A]">
        Login to access Crawler Que
      </p>

      <div className="mt-6 space-y-4">
        <input
          type="email"
          placeholder="Email address"
          className="w-full rounded-xl border border-[#2a2a2a] bg-[#0A0A0A] px-4 py-3 font-mono text-sm text-white outline-none placeholder:text-[#444] focus:border-[#C5FF3D]/60"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full rounded-xl border border-[#2a2a2a] bg-[#0A0A0A] px-4 py-3 font-mono text-sm text-white outline-none placeholder:text-[#444] focus:border-[#C5FF3D]/60"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="button"
          onClick={async () => {
            const res = await fetch("/api/auth/login", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                email,
                password,
              }),
            });

            const json = await res.json();

            if (!json?.success) {
              alert(json?.error || "Login failed");
              return;
            }

            if (json?.user?.role === "admin") {
  window.location.assign("/admin");
} else {
  window.location.assign("/dashboard");
}
          }}
          className="w-full rounded-xl bg-[#C5FF3D] px-4 py-3 font-mono text-sm font-bold uppercase tracking-[0.12em] text-black hover:opacity-90"
        >
          Login →
        </button>

        <a
          href="/forgot-password"
          className="block text-center font-mono text-xs font-bold uppercase tracking-[0.12em] text-[#C5FF3D] hover:opacity-80"
        >
          Forgot password?
        </a>
      </div>
    </div>
  </main>
);
}