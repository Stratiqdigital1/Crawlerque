// @ts-nocheck
"use client";

import { useState } from "react";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      setError("Please fill in all required fields.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to send");
      setSent(true);
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#070707] text-white antialiased">

      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#070707]/96 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5 md:px-8">
          <a href="/" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#C5FF3D] transition hover:shadow-[0_0_12px_rgba(197,255,61,0.4)]">
              <span className="font-mono text-[10px] font-black text-black">CQ</span>
            </div>
            <span className="text-sm font-bold text-white">Crawler Que</span>
          </a>
          <a href="/" className="font-mono text-[11px] uppercase tracking-wider text-white/40 transition hover:text-white">
            &#8592; Back to Home
          </a>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-5 py-16 md:px-8">

        <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.25em] text-[#C5FF3D]">&#9646; Get In Touch</div>
        <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-extrabold leading-tight tracking-tight text-white">
          Contact Us
        </h1>
        <p className="mt-3 max-w-lg text-base leading-relaxed text-white/40">
          Have a question about your plan, a billing issue, or a feature request? We respond within 2 business days.
        </p>

        <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_360px]">

          {/* FORM */}
          <div>
            {sent ? (
              <div className="rounded-2xl border border-[#C5FF3D]/20 bg-[#0d1500] p-10 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C5FF3D]/10">
                  <span className="text-2xl">&#10003;</span>
                </div>
                <h2 className="text-xl font-bold text-white">Message sent</h2>
                <p className="mt-2 text-sm text-white/40">
                  Thanks for reaching out. We will get back to you at <span className="text-white/70">{form.email}</span> within 2 business days.
                </p>
                <a href="/" className="mt-6 inline-block rounded-xl bg-[#C5FF3D] px-6 py-3 font-mono text-sm font-bold uppercase tracking-wider text-black transition hover:bg-white">
                  Back to Home
                </a>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                      Full Name <span className="text-[#C5FF3D]">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="Your name"
                      className="w-full rounded-xl border border-white/8 bg-[#0c0c0c] px-4 py-3.5 text-sm text-white outline-none placeholder:text-white/18 transition focus:border-[#C5FF3D]/35 focus:ring-1 focus:ring-[#C5FF3D]/12"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                      Email Address <span className="text-[#C5FF3D]">*</span>
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      placeholder="you@youragency.com"
                      className="w-full rounded-xl border border-white/8 bg-[#0c0c0c] px-4 py-3.5 text-sm text-white outline-none placeholder:text-white/18 transition focus:border-[#C5FF3D]/35 focus:ring-1 focus:ring-[#C5FF3D]/12"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                    Subject
                  </label>
                  <select
                    value={form.subject}
                    onChange={e => setForm({ ...form, subject: e.target.value })}
                    className="w-full rounded-xl border border-white/8 bg-[#0c0c0c] px-4 py-3.5 text-sm text-white outline-none transition focus:border-[#C5FF3D]/35 focus:ring-1 focus:ring-[#C5FF3D]/12"
                  >
                    <option value="" className="bg-[#111]">Select a topic</option>
                    <option value="Billing question" className="bg-[#111]">Billing question</option>
                    <option value="Technical issue" className="bg-[#111]">Technical issue</option>
                    <option value="Feature request" className="bg-[#111]">Feature request</option>
                    <option value="Account help" className="bg-[#111]">Account help</option>
                    <option value="White-label setup" className="bg-[#111]">White-label setup</option>
                    <option value="Partnership enquiry" className="bg-[#111]">Partnership enquiry</option>
                    <option value="Other" className="bg-[#111]">Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                    Message <span className="text-[#C5FF3D]">*</span>
                  </label>
                  <textarea
                    value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                    placeholder="Describe your question or issue in detail..."
                    rows={6}
                    className="w-full resize-none rounded-xl border border-white/8 bg-[#0c0c0c] px-4 py-3.5 text-sm text-white outline-none placeholder:text-white/18 transition focus:border-[#C5FF3D]/35 focus:ring-1 focus:ring-[#C5FF3D]/12"
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-500/15 bg-red-500/6 px-4 py-3 text-sm text-red-400">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full rounded-xl bg-[#C5FF3D] px-5 py-4 font-mono text-sm font-bold uppercase tracking-wider text-black transition hover:bg-white disabled:opacity-50"
                >
                  {sending ? "Sending..." : "Send Message &#8594;"}
                </button>

                <p className="text-center font-mono text-[10px] uppercase tracking-wider text-white/18">
                  Or email us directly at{" "}
                  <a href="mailto:info@crawlerque.com" className="text-[#C5FF3D] transition hover:underline">
                    info@crawlerque.com
                  </a>
                </p>
              </form>
            )}
          </div>

          {/* SIDEBAR INFO */}
          <div className="space-y-5">
            <div className="rounded-2xl border border-white/6 bg-[#0c0c0c] p-6">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#C5FF3D]/60">Email</div>
              <a href="mailto:info@crawlerque.com" className="text-base font-semibold text-white transition hover:text-[#C5FF3D]">
                info@crawlerque.com
              </a>
              <p className="mt-1.5 text-xs text-white/30">We respond within 2 business days</p>
            </div>

            <div className="rounded-2xl border border-white/6 bg-[#0c0c0c] p-6">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#C5FF3D]/60">Response Time</div>
              <p className="text-base font-semibold text-white">Within 2 business days</p>
              <p className="mt-1.5 text-xs text-white/30">Mon–Fri, excluding public holidays</p>
            </div>

            <div className="rounded-2xl border border-white/6 bg-[#0c0c0c] p-6">
              <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#C5FF3D]/60">Quick Links</div>
              <div className="space-y-2">
{(
                [
                  { url: "/privacy-policy", text: "Privacy Policy" },
                  { url: "/return-policy",  text: "Return Policy" },
                  { url: "/#pricing",       text: "View Plans" },
                  { url: "/login",          text: "Log In" },
                ] as { url: string; text: string }[]
              ).map((link) => (
                
                  key={link.text}
                  href={link.url}
                  className="flex items-center justify-between rounded-lg border border-white/5 px-3 py-2.5 text-sm text-white/45 transition hover:border-white/10 hover:text-white"
                >
                  {link.text}
                  <span className="text-white/20">&#8594;</span>
                </a>
              ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#C5FF3D]/10 bg-[#0d1500] p-6">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#C5FF3D]/60">Billing Issues</div>
              <p className="text-sm leading-relaxed text-white/40">
                For subscription changes, cancellations, or refund requests, log into your dashboard and use the Manage Subscription button in the Subscription tab.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-white/5 px-5 py-8 md:px-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 md:flex-row">
          <span className="text-sm font-bold text-white">Crawler Que</span>
          <div className="flex flex-wrap justify-center gap-5 font-mono text-[10px] uppercase tracking-wider text-white/22">
            <a href="/" className="transition hover:text-white">Home</a>
            <a href="/#pricing" className="transition hover:text-white">Pricing</a>
            <a href="/privacy-policy" className="transition hover:text-white">Privacy Policy</a>
            <a href="/return-policy" className="transition hover:text-white">Return Policy</a>
          </div>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/14">
            &#169; 2026 Crawler Que
          </p>
        </div>
      </footer>

    </main>
  );
}