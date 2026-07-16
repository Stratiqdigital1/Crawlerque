"use client";

import { useEffect, useMemo, useState } from "react";

type AdminBlogPost = {
  id: string;
  slug: string;
  title: string;
  category: string;
  authorName: string;
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
  publishedAt: string | null;
  readingTime: string;
  heroImage: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not published";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatusClasses(status: AdminBlogPost["status"]) {
  if (status === "PUBLISHED") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }

  if (status === "SCHEDULED") {
    return "border-blue-400/20 bg-blue-400/10 text-blue-300";
  }

  if (status === "ARCHIVED") {
    return "border-slate-400/20 bg-slate-400/10 text-slate-300";
  }

  return "border-amber-400/20 bg-amber-400/10 text-amber-300";
}

export default function AdminBlogsPage() {
  const [posts, setPosts] = useState<AdminBlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [error, setError] = useState("");

  const loadPosts = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/blogs", {
        cache: "no-store",
      });

      const json = await response.json();

      if (!response.ok || !json?.success) {
        throw new Error(json?.error || "Failed to load blogs.");
      }

      setPosts(Array.isArray(json.posts) ? json.posts : []);
    } catch (loadError: any) {
      setError(loadError?.message || "Failed to load blogs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const filteredPosts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return posts.filter((post) => {
      const matchesStatus =
        statusFilter === "ALL" || post.status === statusFilter;

      const matchesSearch =
        !normalizedSearch ||
        post.title.toLowerCase().includes(normalizedSearch) ||
        post.slug.toLowerCase().includes(normalizedSearch) ||
        post.category.toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [posts, search, statusFilter]);

  const deletePost = async (post: AdminBlogPost) => {
    const confirmed = window.confirm(
      `Delete "${post.title}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(post.id);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/blogs/${post.id}`,
        {
          method: "DELETE",
        }
      );

      const json = await response.json();

      if (!response.ok || !json?.success) {
        throw new Error(json?.error || "Failed to delete blog.");
      }

      setPosts((currentPosts) =>
        currentPosts.filter((item) => item.id !== post.id)
      );
    } catch (deleteError: any) {
      setError(
        deleteError?.message || "Failed to delete blog."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const publishedCount = posts.filter(
    (post) => post.status === "PUBLISHED"
  ).length;

  const draftCount = posts.filter(
    (post) => post.status === "DRAFT"
  ).length;

  const scheduledCount = posts.filter(
    (post) => post.status === "SCHEDULED"
  ).length;

  return (
    <main className="si-dashboard min-h-screen bg-[var(--cq-ink)] p-5 text-[var(--cq-text)] md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-5 border-b border-[var(--cq-line)] pb-7 md:flex-row md:items-center md:justify-between">
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

              <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
                Blog Management
              </h1>

              <p className="mt-2 text-sm text-[var(--cq-text-2)]">
                Create, edit, publish and manage Crawler Que articles.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/admin"
              className="cq-btn cq-btn--ghost !py-2.5"
            >
              Back to Admin
            </a>

            <a
              href="/admin/blogs/new"
              className="cq-btn cq-btn--primary !py-2.5"
            >
              + Add New Blog
            </a>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard
            label="Total Blogs"
            value={posts.length}
          />

          <StatCard
            label="Published"
            value={publishedCount}
          />

          <StatCard
            label="Drafts"
            value={draftCount}
          />

          <StatCard
            label="Scheduled"
            value={scheduledCount}
          />
        </section>

        <section className="mt-8 rounded-2xl border border-[var(--cq-line)] bg-[var(--cq-surface)] p-5 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="cq-eyebrow cq-eyebrow--signal">
                Content Library
              </p>

              <h2 className="mt-2 text-2xl font-extrabold">
                All Blogs
              </h2>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search title, slug or category"
                className="cq-input min-w-0 sm:min-w-[300px]"
              />

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className="cq-input sm:w-[180px]"
              >
                <option value="ALL">All statuses</option>
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className="mt-8 rounded-xl border border-[var(--cq-line)] bg-[var(--cq-ink)] px-5 py-12 text-center text-[var(--cq-text-2)]">
              Loading blogs...
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-[var(--cq-line)] bg-[var(--cq-ink)] px-6 py-14 text-center">
              <p className="text-xl font-bold text-white">
                {posts.length === 0
                  ? "No database blogs yet"
                  : "No matching blogs found"}
              </p>

              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[var(--cq-text-2)]">
                {posts.length === 0
                  ? "Your existing static blogs will be imported into the database in a later step. You can also create a new article from the admin editor."
                  : "Change the search text or status filter to see more results."}
              </p>

              {posts.length === 0 && (
                <a
                  href="/admin/blogs/new"
                  className="cq-btn cq-btn--primary mt-6"
                >
                  Create First Blog
                </a>
              )}
            </div>
          ) : (
            <div className="mt-7 overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse">
                <thead>
                  <tr className="border-b border-[var(--cq-line)] text-left">
                    <th className="px-3 pb-4 text-sm font-semibold text-[var(--cq-text-3)]">
                      Blog
                    </th>

                    <th className="px-3 pb-4 text-sm font-semibold text-[var(--cq-text-3)]">
                      Category
                    </th>

                    <th className="px-3 pb-4 text-sm font-semibold text-[var(--cq-text-3)]">
                      Status
                    </th>

                    <th className="px-3 pb-4 text-sm font-semibold text-[var(--cq-text-3)]">
                      Publish Date
                    </th>

                    <th className="px-3 pb-4 text-sm font-semibold text-[var(--cq-text-3)]">
                      Updated
                    </th>

                    <th className="px-3 pb-4 text-right text-sm font-semibold text-[var(--cq-text-3)]">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPosts.map((post) => (
                    <tr
                      key={post.id}
                      className="border-b border-[var(--cq-line-soft)] transition hover:bg-white/[0.02]"
                    >
                      <td className="px-3 py-5">
                        <div className="flex items-center gap-4">
                          <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-[var(--cq-line)] bg-[var(--cq-ink)]">
                            {post.heroImage ? (
                              <img
                                src={post.heroImage}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>

                          <div>
                            <p className="max-w-md font-bold text-white">
                              {post.title}
                            </p>

                            <p className="mt-1 max-w-md truncate text-xs text-[var(--cq-text-3)]">
                              /blog/{post.slug}
                            </p>

                            <p className="mt-1 text-xs text-[var(--cq-text-3)]">
                              {post.readingTime}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-5 text-sm text-[var(--cq-text-2)]">
                        {post.category}
                      </td>

                      <td className="px-3 py-5">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusClasses(
                            post.status
                          )}`}
                        >
                          {post.status}
                        </span>
                      </td>

                      <td className="px-3 py-5 text-sm text-[var(--cq-text-2)]">
                        {formatDate(post.publishedAt)}
                      </td>

                      <td className="px-3 py-5 text-sm text-[var(--cq-text-2)]">
                        {formatDate(post.updatedAt)}
                      </td>

                      <td className="px-3 py-5">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`/admin/blogs/${post.id}/edit`}
                            className="rounded-lg border border-[var(--cq-signal)]/25 bg-[var(--cq-signal)]/10 px-3 py-2 text-xs font-semibold text-[var(--cq-signal)] transition hover:bg-[var(--cq-signal)] hover:text-[var(--cq-on-signal)]"
                          >
                            Edit
                          </a>

                          <button
                            type="button"
                            onClick={() => deletePost(post)}
                            disabled={deletingId === post.id}
                            className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingId === post.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
    <div className="cq-card cq-frame p-5">
      <p className="cq-eyebrow">{label}</p>

      <p className="mt-3 text-3xl font-extrabold text-white">
        {value}
      </p>
    </div>
  );
}