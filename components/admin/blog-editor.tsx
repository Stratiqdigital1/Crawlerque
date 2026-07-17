"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { BlogRichText } from "@/components/blog-rich-text";

type BlogStatus = "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";

type BlogBlock =
  | {
      type: "paragraph";
      text: string;
    }
  | {
      type: "heading";
      level: 2 | 3;
      text: string;
    }
  | {
      type: "image";
      src: string;
      alt: string;
    }
  | {
      type: "table";
      rows: string[][];
    }
  | {
      type: "faq";
      title: string;
      items: {
        question: string;
        answer: string;
      }[];
    };

type BlogFormState = {
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  primaryKeyword: string;
  excerpt: string;
  category: string;
  authorName: string;
  status: BlogStatus;
  publishedAt: string;
  readingTime: string;
  heroImage: string;
  heroAlt: string;
  blocks: BlogBlock[];
};

type BlogEditorProps = {
  mode: "create" | "edit";
  postId?: string;
};

const initialForm: BlogFormState = {
  title: "",
  slug: "",
  metaTitle: "",
  metaDescription: "",
  primaryKeyword: "",
  excerpt: "",
  category: "",
  authorName: "Crawler Que",
  status: "DRAFT",
  publishedAt: "",
  readingTime: "4 min read",
  heroImage: "",
  heroAlt: "",
  blocks: [
    {
      type: "paragraph",
      text: "",
    },
  ],
};

function generateSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 180);
}

function toDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
}

function tableRowsToText(rows: string[][]) {
  return rows.map((row) => row.join(" | ")).join("\n");
}

function tableTextToRows(value: string) {
  return value
    .split("\n")
    .map((row) => row.split("|").map((cell) => cell.trim()))
    .filter((row) => row.some((cell) => cell.length > 0));
}

function calculateReadingTime(blocks: BlogBlock[]) {
  const text = blocks
    .map((block) => {
      if (block.type === "paragraph" || block.type === "heading") {
        return block.text;
      }

      if (block.type === "image") {
        return block.alt;
      }

      if (block.type === "faq") {
        return [
          block.title,
          ...block.items.flatMap((item) => [item.question, item.answer]),
        ].join(" ");
      }

      return block.rows.flat().join(" ");
    })
    .join(" ");

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  const minutes = Math.max(1, Math.ceil(wordCount / 220));

  return `${minutes} min read`;
}

function normalizeBlocks(value: unknown): BlogBlock[] {
  if (!Array.isArray(value)) {
    return [
      {
        type: "paragraph",
        text: "",
      },
    ];
  }

  const blocks = value.filter((item): item is BlogBlock =>
    Boolean(item && typeof item === "object" && "type" in item),
  );

  return blocks.length
    ? blocks
    : [
        {
          type: "paragraph",
          text: "",
        },
      ];
}

export default function BlogEditor({ mode, postId }: BlogEditorProps) {
  const router = useRouter();

  const [form, setForm] = useState<BlogFormState>(initialForm);

  const [loading, setLoading] = useState(mode === "edit");

  const [saving, setSaving] = useState(false);

  const [uploadingImageKey, setUploadingImageKey] = useState<string | null>(
    null,
  );

  const [slugManuallyEdited, setSlugManuallyEdited] = useState(mode === "edit");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (mode !== "edit" || !postId) {
      return;
    }

    const loadPost = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/admin/blogs/${postId}`, {
          cache: "no-store",
        });

        const json = await response.json();

        if (!response.ok || !json?.success) {
          throw new Error(json?.error || "Failed to load blog.");
        }

        const post = json.post;

        setForm({
          title: post.title || "",
          slug: post.slug || "",
          metaTitle: post.metaTitle || "",
          metaDescription: post.metaDescription || "",
          primaryKeyword: post.primaryKeyword || "",
          excerpt: post.excerpt || "",
          category: post.category || "",
          authorName: post.authorName || "Crawler Que",
          status: post.status || "DRAFT",
          publishedAt: toDateTimeLocal(post.publishedAt),
          readingTime: post.readingTime || "4 min read",
          heroImage: post.heroImage || "",
          heroAlt: post.heroAlt || "",
          blocks: normalizeBlocks(post.blocks),
        });
      } catch (loadError: any) {
        setError(loadError?.message || "Failed to load blog.");
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [mode, postId]);

  const updateField = <K extends keyof BlogFormState>(
    field: K,
    value: BlogFormState[K],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleTitleChange = (value: string) => {
    setForm((current) => ({
      ...current,
      title: value,
      slug: slugManuallyEdited ? current.slug : generateSlug(value),
      metaTitle:
        current.metaTitle === current.title || !current.metaTitle
          ? value
          : current.metaTitle,
      heroAlt:
        current.heroAlt === current.title || !current.heroAlt
          ? value
          : current.heroAlt,
    }));
  };

  const updateBlock = (index: number, block: BlogBlock) => {
    setForm((current) => ({
      ...current,
      blocks: current.blocks.map((currentBlock, blockIndex) =>
        blockIndex === index ? block : currentBlock,
      ),
    }));
  };

  type ImageUploadTarget =
    | {
        kind: "hero";
      }
    | {
        kind: "block";
        index: number;
      };

  const uploadBlogImage = async (file: File, target: ImageUploadTarget) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Only JPG, PNG, WebP and AVIF images are allowed.");
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setError("Image size cannot exceed 4 MB.");
      return;
    }

    const uploadKey = target.kind === "hero" ? "hero" : `block-${target.index}`;

    setUploadingImageKey(uploadKey);
    setError("");

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      const response = await fetch("/api/admin/blog-images", {
        method: "POST",
        body: uploadFormData,
      });

      const json = await response.json();

      if (!response.ok || !json?.success || !json?.url) {
        throw new Error(json?.error || "Failed to upload image.");
      }

      if (target.kind === "hero") {
        setForm((current) => ({
          ...current,
          heroImage: json.url,
          heroAlt: current.heroAlt || current.title || "Crawler Que blog image",
        }));
      } else {
        setForm((current) => ({
          ...current,
          blocks: current.blocks.map((currentBlock, blockIndex) => {
            if (blockIndex !== target.index || currentBlock.type !== "image") {
              return currentBlock;
            }

            return {
              ...currentBlock,
              src: json.url,
            };
          }),
        }));
      }
    } catch (uploadError: any) {
      setError(uploadError?.message || "Failed to upload image.");
    } finally {
      setUploadingImageKey(null);
    }
  };

  const addBlock = (
    type: "paragraph" | "heading2" | "heading3" | "image" | "table" | "faq",
  ) => {
    let newBlock: BlogBlock;

    if (type === "paragraph") {
      newBlock = {
        type: "paragraph",
        text: "",
      };
    } else if (type === "heading2") {
      newBlock = {
        type: "heading",
        level: 2,
        text: "",
      };
    } else if (type === "heading3") {
      newBlock = {
        type: "heading",
        level: 3,
        text: "",
      };
    } else if (type === "image") {
      newBlock = {
        type: "image",
        src: "",
        alt: "",
      };
    } else if (type === "table") {
      newBlock = {
        type: "table",
        rows: [
          ["Column 1", "Column 2"],
          ["Value 1", "Value 2"],
        ],
      };
    } else {
      newBlock = {
        type: "faq",
        title: "Frequently Asked Questions",
        items: [
          {
            question: "",
            answer: "",
          },
        ],
      };
    }

    setForm((current) => ({
      ...current,
      blocks: [...current.blocks, newBlock],
    }));
  };

  const removeBlock = (index: number) => {
    const confirmed = window.confirm("Remove this content block?");

    if (!confirmed) {
      return;
    }

    setForm((current) => ({
      ...current,
      blocks: current.blocks.filter((_, blockIndex) => blockIndex !== index),
    }));
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    setForm((current) => {
      const nextBlocks = [...current.blocks];

      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= nextBlocks.length) {
        return current;
      }

      [nextBlocks[index], nextBlocks[targetIndex]] = [
        nextBlocks[targetIndex],
        nextBlocks[index],
      ];

      return {
        ...current,
        blocks: nextBlocks,
      };
    });
  };

  const generatedImages = useMemo(() => {
    const images: {
      src: string;
      alt: string;
    }[] = [];

    if (form.heroImage.trim()) {
      images.push({
        src: form.heroImage.trim(),
        alt: form.heroAlt.trim() || form.title.trim(),
      });
    }

    form.blocks.forEach((block) => {
      if (block.type === "image" && block.src.trim()) {
        images.push({
          src: block.src.trim(),
          alt: block.alt.trim(),
        });
      }
    });

    return images.filter(
      (image, index, allImages) =>
        allImages.findIndex((item) => item.src === image.src) === index,
    );
  }, [form.blocks, form.heroAlt, form.heroImage, form.title]);

  const savePost = async (statusOverride?: BlogStatus) => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const finalStatus = statusOverride || form.status;

      const publishedAt = form.publishedAt.trim()
        ? new Date(form.publishedAt).toISOString()
        : null;

      const payload = {
        ...form,
        status: finalStatus,
        publishedAt,
        images: generatedImages,
      };

      const endpoint =
        mode === "edit" ? `/api/admin/blogs/${postId}` : "/api/admin/blogs";

      const response = await fetch(endpoint, {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await response.json();

      if (!response.ok || !json?.success) {
        throw new Error(json?.error || "Failed to save blog.");
      }

      setSuccess(
        mode === "edit"
          ? "Blog updated successfully."
          : "Blog created successfully.",
      );

      router.push("/admin/blogs");
      router.refresh();
    } catch (saveError: any) {
      setError(saveError?.message || "Failed to save blog.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="si-dashboard min-h-screen bg-[var(--cq-ink)] p-8 text-[var(--cq-text)]">
        <div className="mx-auto max-w-7xl rounded-2xl border border-[var(--cq-line)] bg-[var(--cq-surface)] p-12 text-center text-[var(--cq-text-2)]">
          Loading blog editor...
        </div>
      </main>
    );
  }

  return (
    <main className="si-dashboard min-h-screen bg-[var(--cq-ink)] p-5 text-[var(--cq-text)] md:p-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-8 flex flex-col gap-5 border-b border-[var(--cq-line)] pb-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/logo-icon.png"
              alt="Crawler Que"
              className="h-11 w-11 object-contain"
            />

            <div>
              <p className="cq-eyebrow cq-eyebrow--signal">Blog Management</p>

              <h1 className="mt-1 text-3xl font-extrabold">
                {mode === "edit" ? "Edit Blog" : "Add New Blog"}
              </h1>

              <p className="mt-2 text-sm text-[var(--cq-text-2)]">
                Manage content, publishing and SEO settings from one editor.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <a href="/admin/blogs" className="cq-btn cq-btn--ghost !py-2.5">
              Cancel
            </a>

            <button
              type="button"
              disabled={saving}
              onClick={() => savePost("DRAFT")}
              className="cq-btn cq-btn--ghost !py-2.5"
            >
              {saving ? "Saving..." : "Save Draft"}
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => savePost()}
              className="cq-btn cq-btn--primary !py-2.5"
            >
              {saving
                ? "Saving..."
                : mode === "edit"
                  ? "Update Blog"
                  : "Create Blog"}
            </button>
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

        <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_430px]">
          <div className="space-y-7">
            <EditorSection eyebrow="Article Details" title="Blog information">
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Blog Title *" className="md:col-span-2">
                  <input
                    type="text"
                    value={form.title}
                    onChange={(event) => handleTitleChange(event.target.value)}
                    placeholder="Enter the main blog title"
                    className="cq-input"
                  />
                </Field>

                <Field label="Slug *">
                  <div className="flex overflow-hidden rounded-lg border border-[var(--cq-line)] bg-[var(--cq-ink)] focus-within:border-[var(--cq-signal)]">
                    <span className="border-r border-[var(--cq-line)] px-3 py-3 text-sm text-[var(--cq-text-3)]">
                      /blog/
                    </span>

                    <input
                      type="text"
                      value={form.slug}
                      onChange={(event) => {
                        setSlugManuallyEdited(true);

                        updateField("slug", generateSlug(event.target.value));
                      }}
                      className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-white outline-none"
                    />
                  </div>
                </Field>

                <Field label="Category *">
                  <input
                    type="text"
                    value={form.category}
                    onChange={(event) =>
                      updateField("category", event.target.value)
                    }
                    placeholder="SEO, AI Visibility, GEO"
                    className="cq-input"
                  />
                </Field>

                <Field label="Author">
                  <input
                    type="text"
                    value={form.authorName}
                    onChange={(event) =>
                      updateField("authorName", event.target.value)
                    }
                    className="cq-input"
                  />
                </Field>

                <Field label="Reading Time">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={form.readingTime}
                      onChange={(event) =>
                        updateField("readingTime", event.target.value)
                      }
                      className="cq-input"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        updateField(
                          "readingTime",
                          calculateReadingTime(form.blocks),
                        )
                      }
                      className="rounded-lg border border-[var(--cq-line)] px-4 text-xs font-semibold text-[var(--cq-signal)] transition hover:border-[var(--cq-signal)]"
                    >
                      Auto
                    </button>
                  </div>
                </Field>

                <Field label="Excerpt *" className="md:col-span-2">
                  <textarea
                    value={form.excerpt}
                    onChange={(event) =>
                      updateField("excerpt", event.target.value)
                    }
                    rows={4}
                    maxLength={5000}
                    placeholder="Short introduction shown on the blog listing page"
                    className="cq-input resize-y"
                  />

                  <CharacterCount
                    current={form.excerpt.length}
                    recommended="Recommended: 140–300 characters"
                  />
                </Field>
              </div>
            </EditorSection>

            <EditorSection eyebrow="Search Optimisation" title="SEO metadata">
              <div className="grid gap-5">
                <Field label="SEO Title *">
                  <input
                    type="text"
                    value={form.metaTitle}
                    onChange={(event) =>
                      updateField("metaTitle", event.target.value)
                    }
                    maxLength={250}
                    className="cq-input"
                  />

                  <CharacterCount
                    current={form.metaTitle.length}
                    recommended="Recommended: 50–60 characters"
                  />
                </Field>

                <Field label="Meta Description *">
                  <textarea
                    value={form.metaDescription}
                    onChange={(event) =>
                      updateField("metaDescription", event.target.value)
                    }
                    rows={4}
                    maxLength={1000}
                    className="cq-input resize-y"
                  />

                  <CharacterCount
                    current={form.metaDescription.length}
                    recommended="Recommended: 140–160 characters"
                  />
                </Field>

                <Field label="Primary Keyword">
                  <input
                    type="text"
                    value={form.primaryKeyword}
                    onChange={(event) =>
                      updateField("primaryKeyword", event.target.value)
                    }
                    placeholder="Example: technical SEO audit tool"
                    className="cq-input"
                  />
                </Field>
              </div>
            </EditorSection>

            <EditorSection eyebrow="Publishing" title="Status and schedule">
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Blog Status">
                  <select
                    value={form.status}
                    onChange={(event) =>
                      updateField("status", event.target.value as BlogStatus)
                    }
                    className="cq-input"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </Field>

                <Field label="Publish Date">
                  <input
                    type="datetime-local"
                    value={form.publishedAt}
                    onChange={(event) =>
                      updateField("publishedAt", event.target.value)
                    }
                    className="cq-input"
                  />

                  <p className="mt-2 text-xs text-[var(--cq-text-3)]">
                    Required for scheduled blogs. Published blogs can leave it
                    empty to use the current time.
                  </p>
                </Field>
              </div>
            </EditorSection>

            <EditorSection eyebrow="Featured Image" title="Hero image">
              <div className="grid gap-5">
                <Field label="Hero Image *">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <input
                      type="text"
                      value={form.heroImage}
                      onChange={(event) =>
                        updateField("heroImage", event.target.value)
                      }
                      placeholder="Upload an image or paste an image URL"
                      className="cq-input"
                    />

                    <label
                      className={`cq-btn cq-btn--primary min-w-[150px] !py-3 ${
                        uploadingImageKey === "hero"
                          ? "pointer-events-none opacity-50"
                          : ""
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        className="hidden"
                        disabled={uploadingImageKey === "hero"}
                        onChange={(event) => {
                          const file = event.currentTarget.files?.[0];

                          event.currentTarget.value = "";

                          if (file) {
                            void uploadBlogImage(file, {
                              kind: "hero",
                            });
                          }
                        }}
                      />

                      {uploadingImageKey === "hero"
                        ? "Uploading..."
                        : "Upload Image"}
                    </label>
                  </div>

                  <p className="mt-2 text-xs text-[var(--cq-text-3)]">
                    JPG, PNG, WebP or AVIF. Maximum file size: 4 MB. Existing
                    images can still use /blog/filename.png.
                  </p>
                </Field>

                <Field label="Hero Image ALT Text *">
                  <input
                    type="text"
                    value={form.heroAlt}
                    onChange={(event) =>
                      updateField("heroAlt", event.target.value)
                    }
                    className="cq-input"
                  />
                </Field>

                {form.heroImage && (
                  <div className="overflow-hidden rounded-2xl border border-[var(--cq-line)] bg-[var(--cq-ink)]">
                    <img
                      src={form.heroImage}
                      alt={form.heroAlt}
                      className="h-72 w-full object-cover"
                    />
                  </div>
                )}
              </div>
            </EditorSection>

            <EditorSection eyebrow="Article Builder" title="Content blocks">
              <div className="mb-6 flex flex-wrap gap-2">
                <AddBlockButton
                  label="+ Paragraph"
                  onClick={() => addBlock("paragraph")}
                />

                <AddBlockButton
                  label="+ H2 Heading"
                  onClick={() => addBlock("heading2")}
                />

                <AddBlockButton
                  label="+ H3 Heading"
                  onClick={() => addBlock("heading3")}
                />

                <AddBlockButton
                  label="+ Image"
                  onClick={() => addBlock("image")}
                />

                <AddBlockButton
                  label="+ Table"
                  onClick={() => addBlock("table")}
                />

                <AddBlockButton
                  label="+ FAQ Section"
                  onClick={() => addBlock("faq")}
                />
              </div>

              <div className="space-y-4">
                {form.blocks.map((block, index) => (
                  <ContentBlockEditor
                    key={`${block.type}-${index}`}
                    block={block}
                    index={index}
                    totalBlocks={form.blocks.length}
                    uploading={uploadingImageKey === `block-${index}`}
                    onUpload={(file) =>
                      uploadBlogImage(file, {
                        kind: "block",
                        index,
                      })
                    }
                    onChange={(nextBlock) => updateBlock(index, nextBlock)}
                    onMoveUp={() => moveBlock(index, "up")}
                    onMoveDown={() => moveBlock(index, "down")}
                    onRemove={() => removeBlock(index)}
                  />
                ))}

                {form.blocks.length === 0 && (
                  <div className="rounded-xl border border-dashed border-[var(--cq-line)] bg-[var(--cq-ink)] p-10 text-center text-sm text-[var(--cq-text-2)]">
                    Add a paragraph, heading, image, table or FAQ section to
                    start writing.
                  </div>
                )}
              </div>
            </EditorSection>
          </div>

          <aside className="xl:sticky xl:top-8 xl:self-start">
            <LivePreview form={form} />
          </aside>
        </div>
      </div>
    </main>
  );
}

function EditorSection({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--cq-line)] bg-[var(--cq-surface)] p-5 md:p-7">
      <div className="mb-6 border-b border-[var(--cq-line)] pb-5">
        <p className="cq-eyebrow cq-eyebrow--signal">{eyebrow}</p>

        <h2 className="mt-2 text-2xl font-extrabold">{title}</h2>
      </div>

      {children}
    </section>
  );
}

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm font-semibold text-[var(--cq-text-2)]">
        {label}
      </span>

      {children}
    </label>
  );
}

function CharacterCount({
  current,
  recommended,
}: {
  current: number;
  recommended: string;
}) {
  return (
    <div className="mt-2 flex items-center justify-between gap-3 text-xs text-[var(--cq-text-3)]">
      <span>{recommended}</span>
      <span>{current} characters</span>
    </div>
  );
}

function AddBlockButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-[var(--cq-signal)]/25 bg-[var(--cq-signal)]/10 px-4 py-2 text-xs font-semibold text-[var(--cq-signal)] transition hover:bg-[var(--cq-signal)] hover:text-[var(--cq-on-signal)]"
    >
      {label}
    </button>
  );
}

function ContentBlockEditor({
  block,
  index,
  totalBlocks,
  uploading,
  onUpload,
  onChange,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  block: BlogBlock;
  index: number;
  totalBlocks: number;
  uploading: boolean;
  onUpload: (file: File) => Promise<void>;
  onChange: (block: BlogBlock) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const blockLabel =
    block.type === "heading"
      ? `H${block.level} Heading`
      : block.type === "faq"
        ? "FAQ Section"
        : block.type.charAt(0).toUpperCase() + block.type.slice(1);

  const paragraphTextareaRef = useRef<HTMLTextAreaElement>(null);

  const insertParagraphLink = () => {
    if (block.type !== "paragraph") {
      return;
    }

    const textarea = paragraphTextareaRef.current;

    const selectionStart = textarea?.selectionStart ?? block.text.length;

    const selectionEnd = textarea?.selectionEnd ?? selectionStart;

    const selectedText = block.text.slice(selectionStart, selectionEnd).trim();

    const enteredLinkText =
      selectedText || window.prompt("Enter the visible link text:");

    if (!enteredLinkText?.trim()) {
      return;
    }

    const enteredUrl = window.prompt("Link URL enter karo:", "https://");

    if (!enteredUrl?.trim()) {
      return;
    }

    const url = enteredUrl.trim();

    const safeUrl =
      /^(https?:\/\/|mailto:|tel:)/i.test(url) ||
      (url.startsWith("/") && !url.startsWith("//")) ||
      url.startsWith("#");

    if (!safeUrl) {
      window.alert(
        "Enter a valid URL, for example: https://example.com or /pricing",
      );

      return;
    }

    const cleanLinkText = enteredLinkText.trim().replace(/[\[\]]/g, "");

    const markdownLink = `[${cleanLinkText}](${url})`;

    const nextText =
      block.text.slice(0, selectionStart) +
      markdownLink +
      block.text.slice(selectionEnd);

    onChange({
      type: "paragraph",
      text: nextText,
    });

    requestAnimationFrame(() => {
      const nextCursorPosition = selectionStart + markdownLink.length;

      textarea?.focus();

      textarea?.setSelectionRange(nextCursorPosition, nextCursorPosition);
    });
  };

  const handleParagraphKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    const isLinkShortcut =
      (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";

    if (!isLinkShortcut) {
      return;
    }

    event.preventDefault();
    insertParagraphLink();
  };

  return (
    <div className="rounded-xl border border-[var(--cq-line)] bg-[var(--cq-ink)] p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="cq-eyebrow cq-eyebrow--signal">
            Block {index + 1}
          </span>

          <p className="mt-1 text-sm font-bold text-white">{blockLabel}</p>
        </div>

        <div className="flex gap-2">
          <SmallActionButton
            label="↑"
            disabled={index === 0}
            onClick={onMoveUp}
          />

          <SmallActionButton
            label="↓"
            disabled={index === totalBlocks - 1}
            onClick={onMoveDown}
          />

          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-400 hover:text-white"
          >
            Remove
          </button>
        </div>
      </div>

      {block.type === "paragraph" && (
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={insertParagraphLink}
              className="rounded-lg border border-[var(--cq-signal)]/25 bg-[var(--cq-signal)]/10 px-4 py-2 text-xs font-semibold text-[var(--cq-signal)] transition hover:bg-[var(--cq-signal)] hover:text-[var(--cq-on-signal)]"
            >
              + Insert Link
            </button>

            <p className="text-xs text-[var(--cq-text-3)]">
              Select text and press Ctrl + K, or click Insert Link.
            </p>
          </div>

          <textarea
            ref={paragraphTextareaRef}
            value={block.text}
            onChange={(event) =>
              onChange({
                type: "paragraph",
                text: event.target.value,
              })
            }
            onKeyDown={handleParagraphKeyDown}
            rows={7}
            placeholder="Write the paragraph content..."
            className="cq-input resize-y"
          />

          <p className="mt-2 text-xs leading-5 text-[var(--cq-text-3)]">
            You can also add a link manually: [Crawler Que Pricing](/#pricing)
          </p>
        </div>
      )}

      {block.type === "heading" && (
        <div className="grid gap-3 md:grid-cols-[140px_1fr]">
          <select
            value={block.level}
            onChange={(event) =>
              onChange({
                type: "heading",
                level: Number(event.target.value) === 3 ? 3 : 2,
                text: block.text,
              })
            }
            className="cq-input"
          >
            <option value="2">H2 Heading</option>

            <option value="3">H3 Heading</option>
          </select>

          <input
            type="text"
            value={block.text}
            onChange={(event) =>
              onChange({
                ...block,
                text: event.target.value,
              })
            }
            placeholder="Enter heading text"
            className="cq-input"
          />
        </div>
      )}

      {block.type === "image" && (
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input
              type="text"
              value={block.src}
              onChange={(event) =>
                onChange({
                  ...block,
                  src: event.target.value,
                })
              }
              placeholder="Upload an image or paste image URL"
              className="cq-input"
            />

            <label
              className={`cq-btn cq-btn--primary min-w-[150px] !py-3 ${
                uploading ? "pointer-events-none opacity-50" : ""
              }`}
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="hidden"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];

                  event.currentTarget.value = "";

                  if (file) {
                    void onUpload(file);
                  }
                }}
              />

              {uploading ? "Uploading..." : "Upload Image"}
            </label>
          </div>

          <input
            type="text"
            value={block.alt}
            onChange={(event) =>
              onChange({
                ...block,
                alt: event.target.value,
              })
            }
            placeholder="Image ALT text"
            className="cq-input"
          />

          <p className="text-xs text-[var(--cq-text-3)]">
            JPG, PNG, WebP or AVIF. Maximum 4 MB.
          </p>

          {block.src && (
            <img
              src={block.src}
              alt={block.alt}
              className="max-h-72 w-full rounded-xl border border-[var(--cq-line)] object-cover"
            />
          )}
        </div>
      )}

      {block.type === "faq" && (
        <div className="grid gap-4">
          <Field label="FAQ Section Title">
            <input
              type="text"
              value={block.title}
              onChange={(event) =>
                onChange({
                  ...block,
                  title: event.target.value,
                })
              }
              placeholder="Frequently Asked Questions"
              className="cq-input"
            />
          </Field>

          <div className="space-y-4">
            {block.items.map((item, itemIndex) => (
              <div
                key={itemIndex}
                className="rounded-xl border border-[var(--cq-line)] bg-[var(--cq-surface)] p-4"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-white">
                    Question {itemIndex + 1}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...block,
                        items: block.items.filter(
                          (_, currentIndex) => currentIndex !== itemIndex,
                        ),
                      })
                    }
                    className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-400 hover:text-white"
                  >
                    Remove Question
                  </button>
                </div>

                <div className="grid gap-3">
                  <input
                    type="text"
                    value={item.question}
                    onChange={(event) =>
                      onChange({
                        ...block,
                        items: block.items.map((currentItem, currentIndex) =>
                          currentIndex === itemIndex
                            ? {
                                ...currentItem,
                                question: event.target.value,
                              }
                            : currentItem,
                        ),
                      })
                    }
                    placeholder="Enter the FAQ question"
                    className="cq-input"
                  />

                  <textarea
                    value={item.answer}
                    onChange={(event) =>
                      onChange({
                        ...block,
                        items: block.items.map((currentItem, currentIndex) =>
                          currentIndex === itemIndex
                            ? {
                                ...currentItem,
                                answer: event.target.value,
                              }
                            : currentItem,
                        ),
                      })
                    }
                    rows={5}
                    placeholder="Enter the FAQ answer"
                    className="cq-input resize-y"
                  />

                  <p className="text-xs leading-5 text-[var(--cq-text-3)]">
                    Links can be added manually using [link
                    text](https://example.com).
                  </p>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              onChange({
                ...block,
                items: [
                  ...block.items,
                  {
                    question: "",
                    answer: "",
                  },
                ],
              })
            }
            className="rounded-lg border border-[var(--cq-signal)]/25 bg-[var(--cq-signal)]/10 px-4 py-3 text-sm font-semibold text-[var(--cq-signal)] transition hover:bg-[var(--cq-signal)] hover:text-[var(--cq-on-signal)]"
          >
            + Add Another Question
          </button>

          {block.items.length === 0 && (
            <p className="rounded-lg border border-dashed border-[var(--cq-line)] p-4 text-sm text-[var(--cq-text-3)]">
              This FAQ section has no questions. Click Add Another Question to
              continue.
            </p>
          )}
        </div>
      )}

      {block.type === "table" && (
        <div>
          <textarea
            value={tableRowsToText(block.rows)}
            onChange={(event) =>
              onChange({
                type: "table",
                rows: tableTextToRows(event.target.value),
              })
            }
            rows={8}
            className="cq-input resize-y font-mono"
          />

          <p className="mt-2 text-xs leading-5 text-[var(--cq-text-3)]">
            Har line ek table row hai. Columns ko vertical bar se separate karo:
            Heading 1 | Heading 2
          </p>
        </div>
      )}
    </div>
  );
}

function SmallActionButton({
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
      className="rounded-lg border border-[var(--cq-line)] bg-[var(--cq-surface)] px-3 py-2 text-xs font-bold text-[var(--cq-text-2)] transition hover:border-[var(--cq-signal)] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
    >
      {label}
    </button>
  );
}

function LivePreview({ form }: { form: BlogFormState }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--cq-line)] bg-[var(--cq-surface)]">
      <div className="border-b border-[var(--cq-line)] p-5">
        <p className="cq-eyebrow cq-eyebrow--signal">Live Preview</p>

        <p className="mt-2 text-sm text-[var(--cq-text-2)]">
          Approximate public blog appearance
        </p>
      </div>

      <div className="max-h-[calc(100vh-160px)] overflow-y-auto p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--cq-signal)]">
          {form.category || "Blog Category"}
        </p>

        <h1 className="mt-3 text-3xl font-extrabold leading-tight text-white">
          {form.title || "Your blog title"}
        </h1>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--cq-text-3)]">
          <span>{form.authorName || "Crawler Que"}</span>
          <span>•</span>
          <span>{form.readingTime}</span>
          <span>•</span>
          <span>{form.status}</span>
        </div>

        {form.excerpt && (
          <p className="mt-5 text-base leading-7 text-[var(--cq-text-2)]">
            {form.excerpt}
          </p>
        )}

        {form.heroImage && (
          <img
            src={form.heroImage}
            alt={form.heroAlt}
            className="mt-6 h-56 w-full rounded-xl border border-[var(--cq-line)] object-cover"
          />
        )}

        <div className="mt-7">
          {form.blocks.map((block, index) => {
            if (block.type === "paragraph") {
              return (
                <p
                  key={index}
                  className="mt-4 text-sm leading-7 text-[var(--cq-text-2)]"
                >
                  <BlogRichText
                    text={block.text || "Paragraph content will appear here."}
                  />
                </p>
              );
            }

            if (block.type === "heading") {
              return block.level === 2 ? (
                <h2
                  key={index}
                  className="mt-8 text-2xl font-extrabold text-white"
                >
                  {block.text || "H2 heading"}
                </h2>
              ) : (
                <h3 key={index} className="mt-6 text-xl font-bold text-white">
                  {block.text || "H3 heading"}
                </h3>
              );
            }

            if (block.type === "image") {
              return block.src ? (
                <img
                  key={index}
                  src={block.src}
                  alt={block.alt}
                  className="mt-6 h-52 w-full rounded-xl border border-[var(--cq-line)] object-cover"
                />
              ) : null;
            }

            if (block.type === "faq") {
              return (
                <section
                  key={index}
                  className="mt-8 rounded-2xl border border-[var(--cq-line)] bg-[var(--cq-ink)] p-5"
                >
                  <h2 className="text-2xl font-extrabold text-white">
                    {block.title || "Frequently Asked Questions"}
                  </h2>

                  <div className="mt-4 space-y-3">
                    {block.items.map((item, itemIndex) => (
                      <details
                        key={itemIndex}
                        className="rounded-xl border border-[var(--cq-line)] bg-[var(--cq-surface)] p-4"
                      >
                        <summary className="cursor-pointer text-sm font-bold text-white">
                          {item.question || `Question ${itemIndex + 1}`}
                        </summary>

                        <p className="mt-3 text-sm leading-7 text-[var(--cq-text-2)]">
                          <BlogRichText
                            text={item.answer || "FAQ answer will appear here."}
                          />
                        </p>
                      </details>
                    ))}
                  </div>
                </section>
              );
            }

            return (
              <div
                key={index}
                className="mt-6 overflow-x-auto rounded-xl border border-[var(--cq-line)]"
              >
                <table className="w-full min-w-[350px] text-left text-xs">
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr
                        key={rowIndex}
                        className={
                          rowIndex === 0
                            ? "bg-white/10 text-white"
                            : "border-t border-[var(--cq-line)] text-[var(--cq-text-2)]"
                        }
                      >
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="p-3">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
