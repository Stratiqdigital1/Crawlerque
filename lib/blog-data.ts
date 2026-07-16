import "server-only";

import { BlogStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  blogPosts,
  getBlogPost,
  type BlogBlock,
  type BlogPost,
} from "@/lib/blogs";

export type PublicBlogPost = BlogPost & {
  authorName?: string;
  updatedAt?: string;
};

type DatabaseBlogPost = {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  primaryKeyword: string | null;
  excerpt: string;
  category: string;
  authorName: string;
  status: BlogStatus;
  publishedAt: Date | null;
  readingTime: string;
  heroImage: string;
  heroAlt: string;
  images: unknown;
  blocks: unknown;
  updatedAt: Date;
};

const databaseBlogSelect = {
  slug: true,
  title: true,
  metaTitle: true,
  metaDescription: true,
  primaryKeyword: true,
  excerpt: true,
  category: true,
  authorName: true,
  status: true,
  publishedAt: true,
  readingTime: true,
  heroImage: true,
  heroAlt: true,
  images: true,
  blocks: true,
  updatedAt: true,
} as const;

function normalizeImages(
  value: unknown
): BlogPost["images"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (
      !item ||
      typeof item !== "object"
    ) {
      return [];
    }

    const image = item as Record<string, unknown>;
    const src = String(image.src || "").trim();
    const alt = String(image.alt || "").trim();

    if (!src) {
      return [];
    }

    return [
      {
        src,
        alt,
      },
    ];
  });
}

function normalizeBlocks(
  value: unknown
): BlogBlock[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const blocks: BlogBlock[] = [];

  for (const item of value) {
    if (
      !item ||
      typeof item !== "object"
    ) {
      continue;
    }

    const block = item as Record<string, unknown>;
    const type = String(block.type || "");

    if (type === "paragraph") {
      const text = String(block.text || "").trim();

      if (text) {
        blocks.push({
          type: "paragraph",
          text,
        });
      }

      continue;
    }

    if (type === "heading") {
      const text = String(block.text || "").trim();

      if (text) {
        blocks.push({
          type: "heading",
          level:
            Number(block.level) === 3 ? 3 : 2,
          text,
        });
      }

      continue;
    }

    if (type === "image") {
      const src = String(block.src || "").trim();
      const alt = String(block.alt || "").trim();

      if (src) {
        blocks.push({
          type: "image",
          src,
          alt,
        });
      }

      continue;
    }

    if (
      type === "table" &&
      Array.isArray(block.rows)
    ) {
      const rows = block.rows
        .filter((row) => Array.isArray(row))
        .map((row) =>
          (row as unknown[]).map((cell) =>
            String(cell ?? "")
          )
        )
        .filter((row) => row.length > 0);

      if (rows.length > 0) {
        blocks.push({
          type: "table",
          rows,
        });
      }
    }
  }

  return blocks;
}

function databasePostToPublicPost(
  post: DatabaseBlogPost
): PublicBlogPost {
  return {
    slug: post.slug,
    title: post.title,
    metaTitle: post.metaTitle,
    metaDescription: post.metaDescription,
    primaryKeyword:
      post.primaryKeyword || "",
    excerpt: post.excerpt,
    category: post.category,
    publishedAt: post.publishedAt
      ? post.publishedAt
          .toISOString()
          .slice(0, 10)
      : "",
    readingTime: post.readingTime,
    heroImage: post.heroImage,
    heroAlt: post.heroAlt,
    images: normalizeImages(post.images),
    blocks: normalizeBlocks(post.blocks),
    authorName:
      post.authorName || "Crawler Que",
    updatedAt: post.updatedAt.toISOString(),
  };
}

function isDatabasePostPublic(
  post: Pick<
    DatabaseBlogPost,
    "status" | "publishedAt"
  >,
  now: Date
) {
  return (
    post.status === BlogStatus.PUBLISHED &&
    post.publishedAt instanceof Date &&
    post.publishedAt.getTime() <= now.getTime()
  );
}

function isStaticPostPublic(
  post: BlogPost,
  now: Date
) {
  const publishDate = new Date(
    `${post.publishedAt}T00:00:00Z`
  );

  return (
    !Number.isNaN(publishDate.getTime()) &&
    publishDate.getTime() <= now.getTime()
  );
}

function sortNewestFirst(
  posts: PublicBlogPost[]
) {
  return [...posts].sort((a, b) => {
    const dateA = new Date(
      `${a.publishedAt}T00:00:00Z`
    ).getTime();

    const dateB = new Date(
      `${b.publishedAt}T00:00:00Z`
    ).getTime();

    return dateB - dateA;
  });
}

export async function getPublishedBlogPosts(): Promise<
  PublicBlogPost[]
> {
  const now = new Date();

  const availableStaticPosts =
    blogPosts.filter((post) =>
      isStaticPostPublic(post, now)
    );

  try {
    /*
     * All database records are loaded deliberately.
     * A database Draft/Archived post with the same slug
     * must hide its old static version.
     */
    const databasePosts =
      await prisma.blogPost.findMany({
        select: databaseBlogSelect,
        orderBy: [
          {
            publishedAt: "desc",
          },
          {
            updatedAt: "desc",
          },
        ],
      });

    const databaseSlugs = new Set(
      databasePosts.map((post) => post.slug)
    );

    const publishedDatabasePosts =
      databasePosts
        .filter((post) =>
          isDatabasePostPublic(post, now)
        )
        .map((post) =>
          databasePostToPublicPost(post)
        );

    const staticFallbackPosts =
      availableStaticPosts.filter(
        (post) =>
          !databaseSlugs.has(post.slug)
      );

    return sortNewestFirst([
      ...publishedDatabasePosts,
      ...staticFallbackPosts,
    ]);
  } catch (error) {
    console.error(
      "Public blog database load failed. Using static fallback:",
      error
    );

    return sortNewestFirst(
      availableStaticPosts
    );
  }
}

export async function getPublishedBlogPost(
  slug: string
): Promise<PublicBlogPost | null> {
  const normalizedSlug = String(slug || "")
    .trim()
    .toLowerCase();

  if (!normalizedSlug) {
    return null;
  }

  const now = new Date();

  try {
    const databasePost =
      await prisma.blogPost.findUnique({
        where: {
          slug: normalizedSlug,
        },
        select: databaseBlogSelect,
      });

    /*
     * A database record overrides the static post,
     * including when the database record is Draft,
     * Scheduled, or Archived.
     */
    if (databasePost) {
      if (
        !isDatabasePostPublic(
          databasePost,
          now
        )
      ) {
        return null;
      }

      return databasePostToPublicPost(
        databasePost
      );
    }
  } catch (error) {
    console.error(
      "Public database blog lookup failed. Using static fallback:",
      error
    );
  }

  const staticPost =
    getBlogPost(normalizedSlug);

  if (
    !staticPost ||
    !isStaticPostPublic(staticPost, now)
  ) {
    return null;
  }

  return staticPost;
}