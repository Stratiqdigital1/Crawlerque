import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 4 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

function createSafeFileName(fileName: string) {
  const nameWithoutExtension = fileName.replace(
    /\.[^/.]+$/,
    ""
  );

  const normalizedName = nameWithoutExtension
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);

  return normalizedName || "blog-image";
}

export async function POST(request: Request) {
  const { errorResponse } = await requireAdminApi();

  if (errorResponse) {
    return errorResponse;
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "Please select an image file.",
        },
        {
          status: 400,
        }
      );
    }

    if (!ALLOWED_IMAGE_TYPES[file.type]) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Only JPG, PNG, WebP and AVIF images are allowed.",
        },
        {
          status: 400,
        }
      );
    }

    if (file.size <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "The selected image is empty.",
        },
        {
          status: 400,
        }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: "Image size cannot exceed 4 MB.",
        },
        {
          status: 413,
        }
      );
    }

    const safeName = createSafeFileName(file.name);
    const extension = ALLOWED_IMAGE_TYPES[file.type];

    const pathname =
      `crawler-que/blog/${Date.now()}-${safeName}.${extension}`;

    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: true,
      cacheControlMaxAge: 31536000,
    });

    return NextResponse.json({
      success: true,
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType,
      size: file.size,
    });
  } catch (error) {
    console.error("Blog image upload failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to upload blog image.",
      },
      {
        status: 500,
      }
    );
  }
}