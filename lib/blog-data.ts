import "server-only";

import {
  BlogStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  BlogBlock,
  BlogPost,
} from "@/lib/blogs";

export type PublicBlogPost =
  BlogPost & {
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

const publicBlogSelect = {
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

const PUBLIC_STATUSES: BlogStatus[] = [
  BlogStatus.PUBLISHED,
  BlogStatus.SCHEDULED,
];

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

    const image =
      item as Record<
        string,
        unknown
      >;

    const src = String(
      image.src || ""
    ).trim();

    const alt = String(
      image.alt || ""
    ).trim();

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

  const normalizedBlocks:
    BlogBlock[] = [];

  for (const item of value) {
    if (
      !item ||
      typeof item !== "object"
    ) {
      continue;
    }

    const block =
      item as Record<
        string,
        unknown
      >;

    const type = String(
      block.type || ""
    );

    if (type === "paragraph") {
      const text = String(
        block.text || ""
      ).trim();

      if (text) {
        normalizedBlocks.push({
          type: "paragraph",
          text,
        });
      }

      continue;
    }

    if (type === "heading") {
      const text = String(
        block.text || ""
      ).trim();

      if (text) {
        normalizedBlocks.push({
          type: "heading",
          level:
            Number(block.level) === 3
              ? 3
              : 2,
          text,
        });
      }

      continue;
    }

    if (type === "image") {
      const src = String(
        block.src || ""
      ).trim();

      const alt = String(
        block.alt || ""
      ).trim();

      if (src) {
        normalizedBlocks.push({
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
        .filter((row) =>
          Array.isArray(row)
        )
        .map((row) =>
          (
            row as unknown[]
          ).map((cell) =>
            String(cell ?? "")
          )
        )
        .filter(
          (row) =>
            row.length > 0
        );

      if (rows.length > 0) {
        normalizedBlocks.push({
          type: "table",
          rows,
        });
      }
    }
  }

  return normalizedBlocks;
}

function databasePostToPublicPost(
  post: DatabaseBlogPost
): PublicBlogPost {
  return {
    slug: post.slug,
    title: post.title,
    metaTitle: post.metaTitle,
    metaDescription:
      post.metaDescription,
    primaryKeyword:
      post.primaryKeyword || "",
    excerpt: post.excerpt,
    category: post.category,
    publishedAt:
      post.publishedAt
        ? post.publishedAt
            .toISOString()
            .slice(0, 10)
        : "",
    readingTime:
      post.readingTime,
    heroImage: post.heroImage,
    heroAlt: post.heroAlt,
    images: normalizeImages(
      post.images
    ),
    blocks: normalizeBlocks(
      post.blocks
    ),
    authorName:
      post.authorName ||
      "Crawler Que",
    updatedAt:
      post.updatedAt.toISOString(),
  };
}

export async function getPublishedBlogPosts(): Promise<
  PublicBlogPost[]
> {
  const now = new Date();

  try {
    const posts =
      await prisma.blogPost.findMany({
        where: {
          status: {
            in: PUBLIC_STATUSES,
          },
          publishedAt: {
            lte: now,
          },
        },
        select: publicBlogSelect,
        orderBy: [
          {
            publishedAt: "desc",
          },
          {
            updatedAt: "desc",
          },
        ],
      });

    return posts.map(
      databasePostToPublicPost
    );
  } catch (error) {
    console.error(
      "Published blog list failed:",
      error
    );

    return [];
  }
}

export async function getPublishedBlogPost(
  slug: string
): Promise<
  PublicBlogPost | null
> {
  const normalizedSlug =
    String(slug || "")
      .trim()
      .toLowerCase();

  if (!normalizedSlug) {
    return null;
  }

  try {
    const post =
      await prisma.blogPost.findFirst({
        where: {
          slug: normalizedSlug,
          status: {
            in: PUBLIC_STATUSES,
          },
          publishedAt: {
            lte: new Date(),
          },
        },
        select: publicBlogSelect,
      });

    if (!post) {
      return null;
    }

    return databasePostToPublicPost(
      post
    );
  } catch (error) {
    console.error(
      "Published blog lookup failed:",
      error
    );

    return null;
  }
}