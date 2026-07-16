import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin-api";
import {
  BlogValidationError,
  normalizeBlogPayload,
} from "@/lib/blog-admin";

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

    const post = await prisma.blogPost.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        title: true,
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

    await prisma.blogPost.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message: `"${post.title}" deleted successfully.`,
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