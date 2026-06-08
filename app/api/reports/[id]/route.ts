import { NextResponse } from "next/server";
import { withSecurityHeaders } from "@/lib/security-headers";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";

async function getUserFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get("stratiq_session")?.value;

  if (!token) return null;

  try {
    const payload: any = await verifySessionToken(token);

    if (!payload?.userId) return null;

    return {
      id: String(payload.userId),
      email: String(payload.email || ""),
      role: String(payload.role || "user"),
    };
  } catch {
    return null;
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromCookie();

    if (!user) {
      return withSecurityHeaders(
  NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 }
  )
);
    }

    const { id } = await params;

const report = await prisma.auditReport.findFirst({
  where: user.role === "admin"
    ? { id }
    : {
        id,
        userId: user.id,
      },
});

    if (!report) {
      return withSecurityHeaders(
  NextResponse.json(
    { success: false, error: "Report not found" },
    { status: 404 }
  )
);
    }

    return withSecurityHeaders(
  NextResponse.json({
    success: true,
    report,
  })
);
  } catch (error) {
    console.error("Single report fetch failed:", error);

    return withSecurityHeaders(
  NextResponse.json(
    { success: false, error: "Failed to load report" },
    { status: 500 }
  )
);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromCookie();

    if (!user) {
      return withSecurityHeaders(
  NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 }
  )
);
    }

  const { id } = await params;

const deleted = await prisma.auditReport.deleteMany({
  where: user.role === "admin"
    ? { id }
    : {
        id,
        userId: user.id,
      },
});

if (deleted.count === 0) {
  return withSecurityHeaders(
    NextResponse.json(
      { success: false, error: "Report not found" },
      { status: 404 }
    )
  );
}

return withSecurityHeaders(
  NextResponse.json({
    success: true,
  })
);
  } catch (error) {
    console.error("Report delete failed:", error);

    return withSecurityHeaders(
  NextResponse.json(
    { success: false, error: "Failed to delete report" },
    { status: 500 }
  )
);
  }
}