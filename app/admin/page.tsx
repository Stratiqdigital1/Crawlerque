"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {
  const [stats,     setStats]     = useState<any>(null);
  const [users,     setUsers]     = useState<any[]>([]);
  const [reports,   setReports]   = useState<any[]>([]);
  const [packages,  setPackages]  = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Manual user creation state
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newEmail,       setNewEmail]       = useState("");
  const [newPassword,    setNewPassword]    = useState("");
  const [newName,        setNewName]        = useState("");
  const [newPackageId,   setNewPackageId]   = useState("");
  const [newAuditLimit,  setNewAuditLimit]  = useState("10");
  const [creating,       setCreating]       = useState(false);
  const [createError,    setCreateError]    = useState("");
  const [createSuccess,  setCreateSuccess]  = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => res.json())
      .then((json) => {
        setStats(json);
        setUsers(json?.users || []);
        setReports(json?.reports || []);
        setPackages(json?.packageRows || []);
        setAuditLogs(json.auditLogs || []);
      });
  }, []);

  const handleCreateUser = async () => {
    if (!newEmail || !newPassword) {
      setCreateError("Email and password are required.");
      return;
    }
    setCreating(true);
    setCreateError("");
    setCreateSuccess("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:        newEmail,
          password:     newPassword,
          name:         newName,
          packageId:    newPackageId || null,
          monthlyAudits: Number(newAuditLimit) || 10,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create user");
      setCreateSuccess(`User ${newEmail} created successfully.`);
      setNewEmail("");
      setNewPassword("");
      setNewName("");
      setNewPackageId("");
      setNewAuditLimit("10");
      // Reload users list
      fetch("/api/admin/stats")
        .then((r) => r.json())
        .then((j) => setUsers(j?.users || []));
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = async () => {
  if (loggingOut) return;

  setLoggingOut(true);

  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });

    if (!response.ok) {
      throw new Error("Logout failed.");
    }

    window.location.replace("/login");
  } catch (error) {
    console.error("Admin logout failed:", error);
    alert("Logout failed. Please try again.");
    setLoggingOut(false);
  }
};

  return (
    <main className="si-dashboard min-h-screen p-8 text-[var(--cq-text)]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
<div className="flex items-center gap-4">
<img src="/logo-icon.png" alt="Crawler Que" className="h-11 w-11 object-contain" />
            <div>
              <p className="cq-eyebrow cq-eyebrow--signal">Admin Panel</p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
                Crawler Que
              </h1>
            </div>
          </div>

<div className="flex flex-wrap items-center justify-end gap-3">
  <a
    href="/admin/promo-links"
    className="rounded-xl border border-[var(--cq-signal)]/30 bg-[var(--cq-signal)]/10 px-5 py-3 text-sm font-semibold text-[var(--cq-signal)] transition hover:bg-[var(--cq-signal)] hover:text-[var(--cq-on-signal)]"
  >
    Promo Access Links
  </a>

  <a
    href="/admin/blogs"
    className="rounded-xl border border-[var(--cq-signal)]/30 bg-[var(--cq-signal)]/10 px-5 py-3 text-sm font-semibold text-[var(--cq-signal)] transition hover:bg-[var(--cq-signal)] hover:text-[var(--cq-on-signal)]"
  >
    Blog Management
  </a>

  <a
    href="/dashboard"
    className="rounded-xl border border-[var(--cq-line)] bg-[var(--cq-surface)] px-5 py-3 text-sm font-semibold text-[var(--cq-text-2)] transition hover:border-[var(--cq-signal)]/40 hover:text-white"
  >
    Dashboard
  </a>

  <button
    type="button"
    onClick={handleLogout}
    disabled={loggingOut}
    className="inline-flex items-center gap-2 rounded-xl border border-red-400/25 bg-red-400/10 px-5 py-3 text-sm font-semibold text-red-300 transition hover:border-red-400/50 hover:bg-red-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>

    {loggingOut ? "Logging out..." : "Log Out"}
  </button>
</div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <Card
            title="Total Users"
            value={stats?.totalUsers || 0}
          />

          <Card
            title="Audit Reports"
            value={stats?.totalReports || 0}
          />

          <Card
            title="Admins"
            value={stats?.admins || 0}
          />

          <Card
            title="Packages"
            value={stats?.packages || 0}
          />
        </div>

<div className="mt-10 rounded-2xl border border-[#222] bg-[#111] p-6">
          <h2 className="text-2xl font-bold">
            System Status
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Info
              label="Platform"
              value="Crawler Que — AI Website Growth Intelligence"
            />

            <Info
              label="Status"
              value="Operational"
            />
          </div>
                  <div className="mt-10 rounded-2xl border border-[#222] bg-[#111] p-6">
<div className="mb-6 flex items-center justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#C5FF3D]">
                User Management
              </p>
              <h2 className="mt-2 text-3xl font-extrabold">
                Platform Users
              </h2>
            </div>
            <button
              type="button"
              onClick={() => { setShowCreateUser(!showCreateUser); setCreateError(""); setCreateSuccess(""); }}
              className="cq-btn cq-btn--primary !py-2.5"
            >
              {showCreateUser ? "Cancel" : "+ Add User"}
            </button>
          </div>

          {/* CREATE USER FORM */}
          {showCreateUser && (
            <div className="mb-8 rounded-2xl border border-[#C5FF3D]/25 bg-[#0d1500] p-6">
              <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#C5FF3D]">
                Create User — No Payment Required
              </p>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-[#8A8A8A]">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="John Smith"
                    className="w-full rounded-xl border border-[#222] bg-[#0A0A0A] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C5FF3D]/40"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-[#8A8A8A]">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="user@agency.com"
                    className="w-full rounded-xl border border-[#222] bg-[#0A0A0A] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C5FF3D]/40"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-[#8A8A8A]">
                    Password *
                  </label>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full rounded-xl border border-[#222] bg-[#0A0A0A] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C5FF3D]/40"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-[#8A8A8A]">
                    Package (optional)
                  </label>
                  <select
                    value={newPackageId}
                    onChange={(e) => setNewPackageId(e.target.value)}
                    className="w-full rounded-xl border border-[#222] bg-[#0A0A0A] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C5FF3D]/40"
                  >
                    <option value="">No package (free access)</option>
                    {packages.map((pkg: any) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} — {pkg.monthlyAudits} audits/mo
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-[#8A8A8A]">
                    Monthly Audit Limit
                  </label>
                  <input
                    type="number"
                    value={newAuditLimit}
                    onChange={(e) => setNewAuditLimit(e.target.value)}
                    min="1"
                    max="1000"
                    className="w-full rounded-xl border border-[#222] bg-[#0A0A0A] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C5FF3D]/40"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleCreateUser}
                    disabled={creating}
                    className="w-full rounded-xl bg-[#C5FF3D] px-5 py-3 font-mono text-sm font-bold uppercase tracking-wider text-black transition hover:bg-white disabled:opacity-50"
                  >
                    {creating ? "Creating..." : "Create User"}
                  </button>
                </div>
              </div>

              {createError && (
                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-400">
                  {createError}
                </div>
              )}
              {createSuccess && (
                <div className="mt-4 rounded-xl border border-[#C5FF3D]/20 bg-[#C5FF3D]/8 px-4 py-3 text-sm text-[#C5FF3D]">
                  {createSuccess}
                </div>
              )}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
<thead>
                <tr className="border-b border-[#222] text-left">
                  <th className="pb-4 text-sm font-semibold text-[#777]">
                    Email
                  </th>

                  <th className="pb-4 text-sm font-semibold text-[#777]">
                    Role
                  </th>

                  <th className="pb-4 text-sm font-semibold text-[#777]">
                    Package
                  </th>

                  <th className="pb-4 text-sm font-semibold text-[#777]">
                    Audits Used
                  </th>

                  <th className="pb-4 text-sm font-semibold text-[#777]">
                    Status
                  </th>

                  <th className="pb-4 text-sm font-semibold text-[#777]">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-[#1A1A1A] transition hover:bg-white/[0.02]"
                  >
                    <td className="py-5 text-sm text-white">
                      {user.email}
                    </td>

                    <td className="py-5">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          user.role === "admin"
                            ? "bg-[#C5FF3D]/15 text-[#C5FF3D]"
                            : "bg-[#181818] text-[#999]"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>

                    <td className="py-5 text-sm text-[#CCC]">
                      {user.package?.name || "Free"}
                    </td>

                    <td className="py-5 text-sm text-[#CCC]">
                      {user.auditsUsed}
                    </td>

                    <td className="py-5">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                        user.status === "active" || !user.status
                          ? "bg-green-500/10 text-green-400"
                          : "bg-red-500/10 text-red-400"
                      }`}>
                        {user.status || "Active"}
                      </span>
                    </td>

                    <td className="py-5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const newAudits = prompt(
                              `Reset audit count for ${user.email}?\nEnter new count (current: ${user.auditsUsed}):`,
                              "0"
                            );
                            if (newAudits !== null && !isNaN(Number(newAudits))) {
                              fetch(`/api/admin/users/${user.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ auditsUsed: Number(newAudits) }),
                              })
                                .then((r) => r.json())
                                .then((json) => {
                                  if (json.success) {
                                    window.location.reload();
                                  } else {
                                    alert(json.error || "Update failed");
                                  }
                                });
                            }
                          }}
                          className="rounded-lg border border-[#C5FF3D]/20 bg-[#C5FF3D]/8 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-[#C5FF3D] transition hover:border-[#C5FF3D]/40"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const suspend = user.status !== "suspended";
                            if (confirm(`${suspend ? "Suspend" : "Reactivate"} ${user.email}?`)) {
                              fetch(`/api/admin/users/${user.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: suspend ? "suspended" : "active" }),
                              })
                                .then((r) => r.json())
                                .then((json) => {
                                  if (json.success) window.location.reload();
                                  else alert(json.error || "Update failed");
                                });
                            }
                          }}
                          className={`rounded-lg px-2 py-1 font-mono text-[9px] uppercase tracking-wider transition ${
                            user.status === "suspended"
                              ? "border border-green-500/20 bg-green-500/8 text-green-400 hover:border-green-500/40"
                              : "border border-amber-500/20 bg-amber-500/8 text-amber-400 hover:border-amber-500/40"
                          }`}
                        >
                          {user.status === "suspended" ? "Activate" : "Suspend"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </div>

        <div className="mt-10 rounded-2xl border border-[#222] bg-[#111] p-6">
          <div className="mb-6">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#C5FF3D]">
              Audit Reports
            </p>

            <h2 className="mt-2 text-3xl font-extrabold">
              Recent Audits
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="border-b border-[#222] text-left">
                  <th className="pb-4 text-sm font-semibold text-[#777]">
                    Domain
                  </th>

                  <th className="pb-4 text-sm font-semibold text-[#777]">
                    User
                  </th>

                  <th className="pb-4 text-sm font-semibold text-[#777]">
                    Score
                  </th>

                  <th className="pb-4 text-sm font-semibold text-[#777]">
                    Reports
                  </th>

                  <th className="pb-4 text-sm font-semibold text-[#777]">
                    Date
                  </th>
                </tr>
              </thead>

              <tbody>
                {reports.map((report) => (
                  <tr
                    key={report.id}
                    className="border-b border-[#1A1A1A]"
                  >
                    <td className="py-5 text-sm font-semibold text-white">
                      {report.domain}
                    </td>

                    <td className="py-5 text-sm text-[#CCC]">
                      {report.user?.stripeStatus === "promo"
                        ? `Promo: ${report.user?.name || "Access Link"}`
                        : report.user?.email || "Unknown"}
                    </td>

                    <td className="py-5">
                      <span className="rounded-full bg-[#C5FF3D]/10 px-3 py-1 text-xs font-bold text-[#C5FF3D]">
                        {report.overallScore || 0}
                      </span>
                    </td>

                    <td className="py-5 text-sm text-[#999]">
                      {(report.reportTypes || []).join(", ")}
                    </td>

                    <td className="py-5 text-sm text-[#777]">
                      {new Date(
                        report.createdAt
                      ).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-10 rounded-2xl border border-[#222] bg-[#111] p-6">
          <div className="mb-6">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#C5FF3D]">
              Plan Management
            </p>

            <h2 className="mt-2 text-3xl font-extrabold">
              Packages
            </h2>
          </div>

<div className="grid gap-5 md:grid-cols-3">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="rounded-2xl border border-[#222] bg-[#181818] p-6 transition hover:border-[#C5FF3D]/20"
              >
                <h3 className="text-2xl font-bold text-white">
                  {pkg.name}
                </h3>

                <p className="mt-3 text-4xl font-extrabold text-[#C5FF3D]">
                  ${pkg.priceMonthly || 0}
                  <span className="text-sm text-[#777]"> / month</span>
                </p>

                <div className="mt-6 space-y-3 text-sm text-[#CCC]">
                  <p>Audits: {pkg.monthlyAudits}</p>
                  <p>Seats: {pkg.seatLimit || 1}</p>
                  <p>History: {pkg.historyDays || 30} days</p>
                  <p>PDF Export: {pkg.allowPdf ? "Yes" : "No"}</p>
                  <p>White Label: {pkg.allowWhiteLabel ? "Yes" : "No"}</p>
                </div>

                <div className="mt-6 flex gap-2 border-t border-[#222] pt-5">
                  <button
                    type="button"
                    onClick={() => {
                      const newLimit = prompt(
                        `New monthly audit limit for ${pkg.name} (current: ${pkg.monthlyAudits}):`,
                        String(pkg.monthlyAudits)
                      );
                      if (newLimit && !isNaN(Number(newLimit)) && Number(newLimit) > 0) {
                        fetch(`/api/admin/packages/${pkg.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ monthlyAudits: Number(newLimit) }),
                        })
                          .then((r) => r.json())
                          .then((json) => {
                            if (json.success) {
                              alert(`Updated ${pkg.name} to ${newLimit} audits/month`);
                              window.location.reload();
                            } else {
                              alert(json.error || "Update failed");
                            }
                          });
                      }
                    }}
                    className="flex-1 rounded-xl border border-[#C5FF3D]/20 bg-[#C5FF3D]/8 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-[#C5FF3D] transition hover:border-[#C5FF3D]/40 hover:bg-[#C5FF3D]/15"
                  >
                    Edit Limits
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        confirm(
                          `Delete package "${pkg.name}"?\n\nThis will unlink all users on this plan. This cannot be undone.`
                        )
                      ) {
                        fetch(`/api/admin/packages/${pkg.id}`, {
                          method: "DELETE",
                        })
                          .then((r) => r.json())
                          .then((json) => {
                            if (json.success) {
                              alert(`Package "${pkg.name}" deleted`);
                              window.location.reload();
                            } else {
                              alert(json.error || "Delete failed");
                            }
                          });
                      }
                    }}
                    className="rounded-xl border border-red-500/20 bg-red-500/8 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-red-400 transition hover:border-red-500/40 hover:bg-red-500/15"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-[#222] bg-[#111] p-6">
          <div className="mb-6">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#C5FF3D]">
              Security Monitoring
            </p>

            <h2 className="mt-2 text-3xl font-extrabold">
              Recent Audit Logs
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="border-b border-[#222] text-left">
                  <th className="pb-4 text-sm font-semibold text-[#777]">
                    Domain
                  </th>

                  <th className="pb-4 text-sm font-semibold text-[#777]">
                    Mode
                  </th>

                  <th className="pb-4 text-sm font-semibold text-[#777]">
                    Status
                  </th>

                  <th className="pb-4 text-sm font-semibold text-[#777]">
                    Email
                  </th>

                  <th className="pb-4 text-sm font-semibold text-[#777]">
                    IP
                  </th>

                  <th className="pb-4 text-sm font-semibold text-[#777]">
                    Date
                  </th>
                </tr>
              </thead>

              <tbody>
                {auditLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-[#1A1A1A]"
                  >
                    <td className="py-5 text-sm font-semibold text-white">
                      {log.domain}
                    </td>

                    <td className="py-5 text-sm text-[#CCC]">
                      {log.auditMode || "N/A"}
                    </td>

                    <td className="py-5">
                      <span className="rounded-full border border-[#C5FF3D]/30 bg-[#C5FF3D]/10 px-3 py-1 text-xs font-bold text-[#C5FF3D]">
                        {log.status}
                      </span>
                    </td>

                    <td className="py-5 text-sm text-[#CCC]">
                      {log.email || "Guest"}
                    </td>

                    <td className="py-5 text-sm text-[#777]">
                      {log.ip || "N/A"}
                    </td>

                    <td className="py-5 text-sm text-[#777]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
      
  );
}

function Card({
  title,
  value,
}: {
  title: string;
  value: any;
}) {
return (
    <div className="cq-card cq-frame p-6">
      <p className="cq-eyebrow">
        {title}
      </p>

      <h2 className="mt-3 font-mono text-5xl font-extrabold text-[var(--cq-signal)]">
        {value}
      </h2>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
return (
    <div className="cq-card cq-card--raised p-4">
      <p className="cq-eyebrow">
        {label}
      </p>

      <p className="mt-2 text-lg font-semibold text-[var(--cq-text)]">
        {value}
      </p>
    </div>
  );
}