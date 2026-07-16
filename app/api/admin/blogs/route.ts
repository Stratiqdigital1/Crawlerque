import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin-api";
import {
  BlogValidationError,
  normalizeBlogPayload,
} from "@/lib/blog-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { errorResponse } =
    await requireAdminApi();

  if (errorResponse) {
    return errorResponse;
  }

  try {
    const { searchParams } = new URL(request.url);

    const search = (
      searchParams.get("search") || ""
    ).trim();

    const status = (
      searchParams.get("status") || ""
    ).trim().toUpperCase();

    const posts = await prisma.blogPost.findMany({
      where: {
        ...(status
          ? {
              status: status as any,
            }
          : {}),
        ...(search
          ? {
              OR: [
                {
                  title: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  slug: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  category: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: [
        {
          publishedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
select: {
  id: true,
  slug: true,
  title: true,
  category: true,
  authorName: true,
  status: true,
  publishedAt: true,
  readingTime: true,
  heroImage: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
},
    });

    return NextResponse.json({
      success: true,
      posts,
      total: posts.length,
    });
  } catch (error) {
    console.error(
      "Admin blog list failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load blogs.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request: Request) {
  const { adminUser, errorResponse } =
    await requireAdminApi();

  if (errorResponse || !adminUser) {
    return errorResponse;
  }

  try {
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

    const data = normalizeBlogPayload(body);

    const existingBlog =
      await prisma.blogPost.findUnique({
        where: {
          slug: data.slug,
        },
        select: {
          id: true,
        },
      });

    if (existingBlog) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A blog with this slug already exists.",
        },
        {
          status: 409,
        }
      );
    }

    const post = await prisma.blogPost.create({
      data: {
        ...data,
        createdById: adminUser.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        post,
        message: "Blog created successfully.",
      },
      {
        status: 201,
      }
    );
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
      "Admin blog creation failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create blog.",
      },
      {
        status: 500,
      }
    );
  }
}