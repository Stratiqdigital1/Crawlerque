"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);
const [users, setUsers] = useState<any[]>([]);
const [reports, setReports] = useState<any[]>([]);
const [packages, setPackages] = useState<any[]>([]);
const [auditLogs, setAuditLogs] = useState<any[]>([]);

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

  return (
    <main className="min-h-screen bg-[#0A0A0A] p-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#C5FF3D]">
              Admin Panel
            </p>

            <h1 className="mt-2 text-5xl font-extrabold tracking-tight">
              Crawler Que
            </h1>
          </div>

          <a
            href="/dashboard"
            className="rounded-xl border border-[#222] bg-[#111] px-5 py-3 text-sm font-semibold text-[#CCCCCC]"
          >
            Dashboard
          </a>
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
          </div>

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
                      {report.user?.email || "Unknown"}
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
    <div className="rounded-2xl border border-[#222] bg-[#111] p-6">
      <p className="text-sm text-[#8A8A8A]">
        {title}
      </p>

      <h2 className="mt-3 text-5xl font-extrabold text-[#C5FF3D]">
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
    <div className="rounded-xl border border-[#222] bg-[#181818] p-4">
      <p className="text-xs uppercase tracking-wider text-[#777]">
        {label}
      </p>

      <p className="mt-2 text-lg font-semibold text-white">
        {value}
      </p>
    </div>
  );
}