"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type PromoLink = {
  id: string;
  label: string;
  tokenPrefix: string;
  accessUrl: string | null;
  auditLimit: number;
  auditsUsed: number;
  auditsRemaining: number;
  status: "ACTIVE" | "PAUSED";
  expired: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
};

function formatDate(value: string | null) {
  if (!value) {
    return "No expiry";
  }

  return new Date(value).toLocaleString();
}

export default function PromoLinksPage() {
  const [links, setLinks] = useState<
    PromoLink[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  const [busyId, setBusyId] =
    useState<string | null>(null);

  const [label, setLabel] =
    useState("");

  const [auditLimit, setAuditLimit] =
    useState("3");

  const [expiresAt, setExpiresAt] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const activeCount = useMemo(
    () =>
      links.filter(
        (link) =>
          link.status === "ACTIVE" &&
          !link.expired
      ).length,
    [links]
  );

  const loadLinks = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/admin/promo-links",
        {
          cache: "no-store",
        }
      );

      const json =
        await response.json();

      if (
        !response.ok ||
        !json?.success
      ) {
        throw new Error(
          json?.error ||
            "Failed to load links."
        );
      }

      setLinks(json.links || []);
    } catch (loadError: any) {
      setError(
        loadError?.message ||
          "Failed to load links."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLinks();
  }, []);

  const copyLink = async (
    accessUrl: string | null
  ) => {
    if (!accessUrl) {
      setError(
        "This link could not be decrypted. Regenerate it."
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(
        accessUrl
      );

      setSuccess(
        "Promotional link copied."
      );
      setError("");
    } catch {
      window.prompt(
        "Copy this promotional link:",
        accessUrl
      );
    }
  };

  const createLink = async () => {
    setCreating(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        "/api/admin/promo-links",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            label,
            auditLimit: Number(
              auditLimit
            ),
            expiresAt:
              expiresAt
                ? new Date(
                    expiresAt
                  ).toISOString()
                : null,
          }),
        }
      );

      const json =
        await response.json();

      if (
        !response.ok ||
        !json?.success
      ) {
        throw new Error(
          json?.error ||
            "Failed to create link."
        );
      }

      setLinks((current) => [
        json.link,
        ...current,
      ]);

      setLabel("");
      setAuditLimit("3");
      setExpiresAt("");

      setSuccess(
        "Promotional access link created."
      );

      await copyLink(
        json.link?.accessUrl || null
      );
    } catch (createError: any) {
      setError(
        createError?.message ||
          "Failed to create link."
      );
    } finally {
      setCreating(false);
    }
  };

  const updateLink = async (
    id: string,
    body: Record<string, unknown>,
    successMessage: string
  ) => {
    setBusyId(id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/admin/promo-links/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const json =
        await response.json();

      if (
        !response.ok ||
        !json?.success
      ) {
        throw new Error(
          json?.error ||
            "Failed to update link."
        );
      }

      setLinks((current) =>
        current.map((link) =>
          link.id === id
            ? json.link
            : link
        )
      );

      setSuccess(successMessage);

      if (body.regenerate === true) {
        await copyLink(
          json.link?.accessUrl || null
        );
      }
    } catch (updateError: any) {
      setError(
        updateError?.message ||
          "Failed to update link."
      );
    } finally {
      setBusyId(null);
    }
  };

  const changeLimit = (
    link: PromoLink
  ) => {
    const nextValue = window.prompt(
      `Set audit limit for ${link.label}:`,
      String(link.auditLimit)
    );

    if (nextValue === null) {
      return;
    }

    const limit = Number(nextValue);

    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      window.alert(
        "Enter a whole number between 1 and 100."
      );
      return;
    }

    void updateLink(
      link.id,
      {
        auditLimit: limit,
      },
      "Audit limit updated."
    );
  };

  const changeExpiry = (
    link: PromoLink
  ) => {
    const currentValue =
      link.expiresAt
        ? new Date(
            link.expiresAt
          )
            .toISOString()
            .slice(0, 16)
        : "";

    const nextValue = window.prompt(
      "Enter a new expiry in YYYY-MM-DDTHH:mm format. Leave it blank for no expiry:",
      currentValue
    );

    if (nextValue === null) {
      return;
    }

    const normalized =
      nextValue.trim();

    if (!normalized) {
      void updateLink(
        link.id,
        {
          expiresAt: null,
        },
        "Link expiry removed."
      );
      return;
    }

    const date = new Date(
      normalized
    );

    if (
      Number.isNaN(
        date.getTime()
      ) ||
      date.getTime() <= Date.now()
    ) {
      window.alert(
        "Enter a valid future date and time."
      );
      return;
    }

    void updateLink(
      link.id,
      {
        expiresAt:
          date.toISOString(),
      },
      "Link expiry updated."
    );
  };

  const deleteLink = async (
    link: PromoLink
  ) => {
    const confirmed = window.confirm(
      `Delete "${link.label}"?\n\nThis immediately disables the link and permanently deletes its promotional audit history.`
    );

    if (!confirmed) {
      return;
    }

    setBusyId(link.id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/admin/promo-links/${link.id}`,
        {
          method: "DELETE",
        }
      );

      const json =
        await response.json();

      if (
        !response.ok ||
        !json?.success
      ) {
        throw new Error(
          json?.error ||
            "Failed to delete link."
        );
      }

      setLinks((current) =>
        current.filter(
          (item) =>
            item.id !== link.id
        )
      );

      setSuccess(
        "Promotional link deleted."
      );
    } catch (deleteError: any) {
      setError(
        deleteError?.message ||
          "Failed to delete link."
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="si-dashboard min-h-screen bg-[var(--cq-ink)] p-5 text-[var(--cq-text)] md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-5 border-b border-[var(--cq-line)] pb-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/logo-icon.png"
              alt="Crawler Que"
              className="h-11 w-11 object-contain"
            />

            <div>
              <p className="cq-eyebrow cq-eyebrow--signal">
                Admin Panel
              </p>

              <h1 className="mt-1 text-3xl font-extrabold">
                Promotional Audit Links
              </h1>

              <p className="mt-2 text-sm text-[var(--cq-text-2)]">
                Create private, card-free links
                that open the full audit
                dashboard directly.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/admin"
              className="cq-btn cq-btn--ghost !py-2.5"
            >
              Back to Admin
            </a>

            <a
              href="/admin/blogs"
              className="cq-btn cq-btn--ghost !py-2.5"
            >
              Blog Management
            </a>
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-4 text-sm text-emerald-300">
            {success}
          </div>
        )}

        <div className="mb-7 grid gap-4 md:grid-cols-3">
          <StatCard
            label="Total Links"
            value={links.length}
          />

          <StatCard
            label="Active Links"
            value={activeCount}
          />

          <StatCard
            label="Total Audits Used"
            value={links.reduce(
              (total, link) =>
                total + link.auditsUsed,
              0
            )}
          />
        </div>

        <section className="mb-8 rounded-2xl border border-[var(--cq-line)] bg-[var(--cq-surface)] p-5 md:p-7">
          <div className="mb-6">
            <p className="cq-eyebrow cq-eyebrow--signal">
              Create Access
            </p>

            <h2 className="mt-2 text-2xl font-extrabold">
              New promotional link
            </h2>

            <p className="mt-2 text-sm leading-6 text-[var(--cq-text-2)]">
              Each link has its own audit
              allowance and private report
              history. Default access is three
              full-module audits.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_240px_auto] lg:items-end">
            <label>
              <span className="mb-2 block text-sm font-semibold text-[var(--cq-text-2)]">
                Recipient or Campaign Name
              </span>

              <input
                type="text"
                value={label}
                onChange={(event) =>
                  setLabel(
                    event.target.value
                  )
                }
                placeholder="Example: Meta Ads Partner — July"
                className="cq-input"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold text-[var(--cq-text-2)]">
                Allowed Audits
              </span>

              <input
                type="number"
                min="1"
                max="100"
                value={auditLimit}
                onChange={(event) =>
                  setAuditLimit(
                    event.target.value
                  )
                }
                className="cq-input"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold text-[var(--cq-text-2)]">
                Expiry (Optional)
              </span>

              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(event) =>
                  setExpiresAt(
                    event.target.value
                  )
                }
                className="cq-input"
              />
            </label>

            <button
              type="button"
              disabled={
                creating ||
                !label.trim()
              }
              onClick={createLink}
              className="cq-btn cq-btn--primary !py-3 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating
                ? "Creating..."
                : "Create & Copy Link"}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--cq-line)] bg-[var(--cq-surface)] p-5 md:p-7">
          <div className="mb-6">
            <p className="cq-eyebrow cq-eyebrow--signal">
              Link Management
            </p>

            <h2 className="mt-2 text-2xl font-extrabold">
              Existing promotional links
            </h2>
          </div>

          {loading ? (
            <div className="rounded-xl border border-[var(--cq-line)] bg-[var(--cq-ink)] p-10 text-center text-sm text-[var(--cq-text-2)]">
              Loading promotional links...
            </div>
          ) : links.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--cq-line)] bg-[var(--cq-ink)] p-10 text-center text-sm text-[var(--cq-text-2)]">
              No promotional links created yet.
            </div>
          ) : (
            <div className="space-y-4">
              {links.map((link) => {
                const inactive =
                  link.status ===
                    "PAUSED" ||
                  link.expired;

                const busy =
                  busyId === link.id;

                return (
                  <article
                    key={link.id}
                    className="rounded-2xl border border-[var(--cq-line)] bg-[var(--cq-ink)] p-5"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-bold text-white">
                            {link.label}
                          </h3>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              inactive
                                ? "bg-red-400/10 text-red-300"
                                : "bg-emerald-400/10 text-emerald-300"
                            }`}
                          >
                            {link.expired
                              ? "Expired"
                              : link.status ===
                                  "ACTIVE"
                                ? "Active"
                                : "Paused"}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                          <input
                            type="text"
                            readOnly
                            value={
                              link.accessUrl ||
                              "Link unavailable — regenerate"
                            }
                            className="cq-input font-mono text-xs"
                          />

                          <button
                            type="button"
                            disabled={
                              busy ||
                              !link.accessUrl
                            }
                            onClick={() =>
                              copyLink(
                                link.accessUrl
                              )
                            }
                            className="cq-btn cq-btn--primary !py-3 disabled:opacity-50"
                          >
                            Copy Link
                          </button>
                        </div>

                        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                          <Info
                            label="Usage"
                            value={`${link.auditsUsed} / ${link.auditLimit}`}
                          />

                          <Info
                            label="Remaining"
                            value={String(
                              link.auditsRemaining
                            )}
                          />

                          <Info
                            label="Expiry"
                            value={formatDate(
                              link.expiresAt
                            )}
                          />

                          <Info
                            label="Last Used"
                            value={
                              link.lastUsedAt
                                ? formatDate(
                                    link.lastUsedAt
                                  )
                                : "Not used yet"
                            }
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 xl:max-w-[340px] xl:justify-end">
                        <ActionButton
                          label={
                            link.status ===
                            "ACTIVE"
                              ? "Pause"
                              : "Activate"
                          }
                          disabled={busy}
                          onClick={() =>
                            updateLink(
                              link.id,
                              {
                                status:
                                  link.status ===
                                  "ACTIVE"
                                    ? "PAUSED"
                                    : "ACTIVE",
                              },
                              link.status ===
                                "ACTIVE"
                                ? "Link paused."
                                : "Link activated."
                            )
                          }
                        />

                        <ActionButton
                          label="Change Limit"
                          disabled={busy}
                          onClick={() =>
                            changeLimit(link)
                          }
                        />

                        <ActionButton
                          label="Change Expiry"
                          disabled={busy}
                          onClick={() =>
                            changeExpiry(link)
                          }
                        />

                        <ActionButton
                          label="Reset Usage"
                          disabled={busy}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Reset ${link.label} to 0 used audits?`
                              )
                            ) {
                              void updateLink(
                                link.id,
                                {
                                  resetUsage:
                                    true,
                                },
                                "Audit usage reset."
                              );
                            }
                          }}
                        />

                        <ActionButton
                          label="Regenerate"
                          disabled={busy}
                          onClick={() => {
                            if (
                              window.confirm(
                                "Regenerate this link? The old URL will stop working immediately."
                              )
                            ) {
                              void updateLink(
                                link.id,
                                {
                                  regenerate:
                                    true,
                                },
                                "New link generated and copied."
                              );
                            }
                          }}
                        />

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            deleteLink(link)
                          }
                          className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-400 hover:text-white disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-[var(--cq-line)] bg-[var(--cq-surface)] p-5">
      <p className="text-sm text-[var(--cq-text-2)]">
        {label}
      </p>

      <p className="mt-2 text-3xl font-extrabold text-white">
        {value}
      </p>
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
    <div className="rounded-xl border border-[var(--cq-line)] bg-[var(--cq-surface)] p-3">
      <p className="text-xs uppercase tracking-wide text-[var(--cq-text-3)]">
        {label}
      </p>

      <p className="mt-1 break-words font-semibold text-white">
        {value}
      </p>
    </div>
  );
}

function ActionButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg border border-[var(--cq-line)] bg-[var(--cq-surface)] px-3 py-2 text-xs font-bold text-[var(--cq-text-2)] transition hover:border-[var(--cq-signal)] hover:text-white disabled:opacity-50"
    >
      {label}
    </button>
  );
}
