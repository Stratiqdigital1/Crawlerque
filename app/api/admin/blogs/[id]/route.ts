import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin-api";
import {
  BlogValidationError,
  normalizeBlogPayload,
} from "@/lib/blog-admin";

function isManagedBlogBlobUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }

  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(
        ".blob.vercel-storage.com"
      ) &&
      url.pathname.includes(
        "/crawler-que/blog/"
      )
    );
  } catch {
    return false;
  }
}

function collectBlogImageUrls(post: {
  heroImage?: unknown;
  images?: unknown;
  blocks?: unknown;
}) {
  const urls = new Set<string>();

  if (isManagedBlogBlobUrl(post.heroImage)) {
    urls.add(String(post.heroImage));
  }

  if (Array.isArray(post.images)) {
    for (const image of post.images) {
      if (
        image &&
        typeof image === "object" &&
        "src" in image
      ) {
        const src = (
          image as Record<string, unknown>
        ).src;

        if (isManagedBlogBlobUrl(src)) {
          urls.add(String(src));
        }
      }
    }
  }

  if (Array.isArray(post.blocks)) {
    for (const block of post.blocks) {
      if (
        block &&
        typeof block === "object" &&
        (block as Record<string, unknown>)
          .type === "image"
      ) {
        const src = (
          block as Record<string, unknown>
        ).src;

        if (isManagedBlogBlobUrl(src)) {
          urls.add(String(src));
        }
      }
    }
  }

  return Array.from(urls);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: Request,
  context: RouteContext
) {
  const { errorResponse } =
    await requireAdminApi();

  if (errorResponse) {
    return errorResponse;
  }

  try {
    const { id } = await context.params;

    const post = await prisma.blogPost.findUnique({
      where: {
        id,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json(
        {
          success: false,
          error: "Blog not found.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      post,
    });
  } catch (error) {
    console.error(
      "Admin blog load failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load blog.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  const { errorResponse } =
    await requireAdminApi();

  if (errorResponse) {
    return errorResponse;
  }

  try {
    const { id } = await context.params;
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid blog data.",
        },
        {
          status: 400,
        }
      );
    }

    const currentPost =
      await prisma.blogPost.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          slug: true,
        },
      });

    if (!currentPost) {
      return NextResponse.json(
        {
          success: false,
          error: "Blog not found.",
        },
        {
          status: 404,
        }
      );
    }

    const data = normalizeBlogPayload(body);

    const slugConflict =
      await prisma.blogPost.findFirst({
        where: {
          slug: data.slug,
          NOT: {
            id,
          },
        },
        select: {
          id: true,
        },
      });

    if (slugConflict) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Another blog already uses this slug.",
        },
        {
          status: 409,
        }
      );
    }

    const post = await prisma.blogPost.update({
      where: {
        id,
      },
      data,
    });

    return NextResponse.json({
      success: true,
      post,
      message: "Blog updated successfully.",
    });
  } catch (error) {
    if (error instanceof BlogValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        {
          status: 400,
        }
      );
    }

    console.error(
      "Admin blog update failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update blog.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext
) {
  const { errorResponse } =
    await requireAdminApi();

  if (errorResponse) {
    return errorResponse;
  }

  try {
    const { id } = await context.params;

    const post =
      await prisma.blogPost.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          title: true,
          heroImage: true,
          images: true,
          blocks: true,
        },
      });

    if (!post) {
      return NextResponse.json(
        {
          success: false,
          error: "Blog not found.",
        },
        {
          status: 404,
        }
      );
    }

    const candidateBlobUrls =
      collectBlogImageUrls(post);

    /*
     * Check other blogs before deleting images.
     * This protects an image when two blogs use
     * the same Blob URL.
     */
    const otherPosts =
      await prisma.blogPost.findMany({
        where: {
          NOT: {
            id,
          },
        },
        select: {
          heroImage: true,
          images: true,
          blocks: true,
        },
      });

    const imageUrlsUsedElsewhere = new Set(
      otherPosts.flatMap((otherPost) =>
        collectBlogImageUrls(otherPost)
      )
    );

    const blobUrlsToDelete =
      candidateBlobUrls.filter(
        (url) =>
          !imageUrlsUsedElsewhere.has(url)
      );

    /*
     * Delete database record first.
     * Public article becomes unavailable
     * immediately.
     */
    await prisma.blogPost.delete({
      where: {
        id,
      },
    });

    let deletedBlobCount = 0;
    let blobCleanupWarning: string | null =
      null;

    if (blobUrlsToDelete.length > 0) {
      try {
        await del(blobUrlsToDelete);
        deletedBlobCount =
          blobUrlsToDelete.length;
      } catch (blobError) {
        console.error(
          "Blog deleted but Blob cleanup failed:",
          {
            postId: id,
            urls: blobUrlsToDelete,
            error: blobError,
          }
        );

        blobCleanupWarning =
          "Blog was deleted, but one or more uploaded images could not be removed from storage.";
      }
    }

    return NextResponse.json({
      success: true,
      message: `"${post.title}" deleted successfully.`,
      deletedBlobCount,
      warning: blobCleanupWarning,
    });
  } catch (error) {
    console.error(
      "Admin blog deletion failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete blog.",
      },
      {
        status: 500,
      }
    );
  }
}