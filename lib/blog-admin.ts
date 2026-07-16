import { BlogStatus, Prisma } from "@prisma/client";

export class BlogValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlogValidationError";
  }
}

function requiredString(
  value: unknown,
  fieldName: string,
  maxLength = 500
) {
  const normalized = String(value || "").trim();

  if (!normalized) {
    throw new BlogValidationError(`${fieldName} is required.`);
  }

  if (normalized.length > maxLength) {
    throw new BlogValidationError(
      `${fieldName} cannot exceed ${maxLength} characters.`
    );
  }

  return normalized;
}

function optionalString(
  value: unknown,
  maxLength = 500
) {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return null;
  }

  if (normalized.length > maxLength) {
    throw new BlogValidationError(
      `Value cannot exceed ${maxLength} characters.`
    );
  }

  return normalized;
}

export function createBlogSlug(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 180);
}

function normalizeBlogStatus(
  value: unknown
): BlogStatus {
  const status = String(value || "DRAFT").toUpperCase();

  const validStatuses = Object.values(BlogStatus);

  if (!validStatuses.includes(status as BlogStatus)) {
    throw new BlogValidationError(
      "Invalid blog status."
    );
  }

  return status as BlogStatus;
}

function normalizePublishedAt(
  value: unknown,
  status: BlogStatus
) {
  if (!value) {
    if (status === BlogStatus.PUBLISHED) {
      return new Date();
    }

    if (status === BlogStatus.SCHEDULED) {
      throw new BlogValidationError(
        "Publish date is required for a scheduled blog."
      );
    }

    return null;
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    throw new BlogValidationError(
      "Publish date is invalid."
    );
  }

  if (
    status === BlogStatus.SCHEDULED &&
    date.getTime() <= Date.now()
  ) {
    throw new BlogValidationError(
      "Scheduled publish date must be in the future."
    );
  }

  return date;
}

function normalizeImages(
  value: unknown
): Prisma.InputJsonValue {
  if (!Array.isArray(value)) {
    return [];
  }

  const images = value
    .map((image) => {
      if (!image || typeof image !== "object") {
        return null;
      }

      const item = image as Record<string, unknown>;
      const src = String(item.src || "").trim();
      const alt = String(item.alt || "").trim();

      if (!src) {
        return null;
      }

      return {
        src,
        alt,
      };
    })
    .filter(Boolean);

  return images as Prisma.InputJsonValue;
}

function normalizeBlocks(
  value: unknown
): Prisma.InputJsonValue {
  if (!Array.isArray(value)) {
    return [];
  }

  const blocks = value
    .map((block) => {
      if (!block || typeof block !== "object") {
        return null;
      }

      const item = block as Record<string, unknown>;
      const type = String(item.type || "").trim();

      if (type === "paragraph") {
        const text = String(item.text || "").trim();

        if (!text) return null;

        return {
          type: "paragraph",
          text,
        };
      }

      if (type === "heading") {
        const text = String(item.text || "").trim();
        const level =
          Number(item.level) === 3 ? 3 : 2;

        if (!text) return null;

        return {
          type: "heading",
          level,
          text,
        };
      }

      if (type === "image") {
        const src = String(item.src || "").trim();
        const alt = String(item.alt || "").trim();

        if (!src) return null;

        return {
          type: "image",
          src,
          alt,
        };
      }

      if (type === "table") {
        if (!Array.isArray(item.rows)) {
          return null;
        }

        const rows = item.rows
          .filter((row) => Array.isArray(row))
          .map((row) =>
            (row as unknown[]).map((cell) =>
              String(cell ?? "")
            )
          );

        if (!rows.length) return null;

        return {
          type: "table",
          rows,
        };
      }

      return null;
    })
    .filter(Boolean);

  return blocks as Prisma.InputJsonValue;
}

export function normalizeBlogPayload(
  body: Record<string, unknown>
) {
  const title = requiredString(
    body.title,
    "Title",
    250
  );

  const slug = createBlogSlug(
    String(body.slug || title)
  );

  if (!slug) {
    throw new BlogValidationError(
      "A valid slug could not be generated."
    );
  }

  const status = normalizeBlogStatus(body.status);
  const publishedAt = normalizePublishedAt(
    body.publishedAt,
    status
  );

  return {
    slug,
    title,
    metaTitle: requiredString(
      body.metaTitle || title,
      "SEO title",
      250
    ),
    metaDescription: requiredString(
      body.metaDescription,
      "Meta description",
      1000
    ),
    primaryKeyword: optionalString(
      body.primaryKeyword,
      250
    ),
    excerpt: requiredString(
      body.excerpt,
      "Excerpt",
      5000
    ),
    category: requiredString(
      body.category,
      "Category",
      150
    ),
    authorName:
      optionalString(body.authorName, 150) ||
      "Crawler Que",
    status,
    publishedAt,
    readingTime:
      optionalString(body.readingTime, 100) ||
      "4 min read",
    heroImage: requiredString(
      body.heroImage,
      "Hero image",
      2000
    ),
    heroAlt: requiredString(
      body.heroAlt || title,
      "Hero image ALT text",
      500
    ),
    images: normalizeImages(body.images),
    blocks: normalizeBlocks(body.blocks),
  };
}