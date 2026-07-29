import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { withSecurityHeaders } from "@/lib/security-headers";
import { pollAndFinalizeTechnicalAuditJob } from "@/lib/technical-crawl-finalizer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function getUserFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get("stratiq_session")?.value;

  if (!token) return null;

  try {
    const payload = await verifySessionToken(token);
    if (!payload?.userId) return null;

    return {
      id: String(payload.userId),
      role: String(payload.role || "user"),
    };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const taskId = String(searchParams.get("taskId") || "").trim();
    const auditJobId = String(searchParams.get("auditJobId") || "").trim();
    const inputHash = String(searchParams.get("inputHash") || "").trim();
    const normalizedDomain = String(
      searchParams.get("normalizedDomain") || ""
    )
      .trim()
      .toLowerCase()
      .replace(/^www\./, "");
    const finalAttempt = searchParams.get("finalAttempt") === "true";

    if (!taskId || !auditJobId || !inputHash || !normalizedDomain) {
      return withSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error: "Complete audit identity is required.",
          },
          { status: 400 }
        )
      );
    }

    const result = await pollAndFinalizeTechnicalAuditJob({
      jobId: auditJobId,
      userId: user.id,
      expectedTaskId: taskId,
      expectedInputHash: inputHash,
      expectedDomain: normalizedDomain,
      finalAttempt,
    });

    return withSecurityHeaders(NextResponse.json(result));
  } catch (error) {
    console.error("OnPage status route failed:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Technical crawl status could not be loaded.";
    const status = /not found/i.test(message)
      ? 404
      : /identity mismatch/i.test(message)
        ? 409
        : 500;

    return withSecurityHeaders(
      NextResponse.json(
        {
          success: false,
          error:
            status === 500
              ? "Technical crawl status could not be loaded. Please try again."
              : message,
        },
        { status }
      )
    );
  }
}
