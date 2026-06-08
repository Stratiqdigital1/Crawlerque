import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { withSecurityHeaders } from "@/lib/security-headers";

async function getUserFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get("stratiq_session")?.value;

  if (!token) return null;

  try {
    const payload: any = await verifySessionToken(token);

    if (!payload?.userId) return null;

    return {
      id: String(payload.userId),
      role: String(payload.role || "user"),
    };
  } catch {
    return null;
  }
}

function extractDomainFromUrl(input: string) {
  try {
    const withProtocol = /^https?:\/\//i.test(input)
      ? input
      : `https://${input}`;

    return new URL(withProtocol).hostname.replace(/^www\./, "");
  } catch {
    return input.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
}

export async function POST(req: Request) {
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

    const body = await req.json();
    const url = String(body?.url || "");
    const reportTypes = Array.isArray(body?.reportTypes)
      ? body.reportTypes
      : [];

    if (!url) {
      return withSecurityHeaders(
        NextResponse.json(
          { success: false, error: "URL is required." },
          { status: 400 }
        )
      );
    }

    const job = await prisma.auditJob.create({
      data: {
        userId: user.id,
        domain: extractDomainFromUrl(url),
        url,
        reportTypes,
        status: "pending",
        progress: 1,
        currentModule: "Audit queued",
        moduleStatus: {},
      },
      select: {
        id: true,
        status: true,
        progress: true,
        currentModule: true,
      },
    });

    return withSecurityHeaders(
      NextResponse.json({
        success: true,
        job,
        auditJobId: job.id,
      })
    );
  } catch (error) {
    console.error("Audit job start failed:", error);

    return withSecurityHeaders(
      NextResponse.json(
        { success: false, error: "Failed to start audit job." },
        { status: 500 }
      )
    );
  }
}