import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pollAndFinalizeTechnicalAuditJob } from "@/lib/technical-crawl-finalizer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const jobs = await prisma.auditJob.findMany({
    where: {
      status: {
        in: ["processing_technical", "running"],
      },
      technicalTaskId: {
        not: null,
      },
      resultReportId: {
        not: null,
      },
      renderReady: false,
    },
    orderBy: {
      startedAt: "asc",
    },
    take: 10,
  });

  const results: Array<Record<string, unknown>> = [];

  for (const job of jobs) {
    const ageMs = Date.now() - new Date(job.startedAt || job.createdAt).getTime();
    const finalAttempt = ageMs >= 10 * 60 * 1000;

    try {
      const result = await pollAndFinalizeTechnicalAuditJob({
        jobId: job.id,
        finalAttempt,
      });

      results.push({
        jobId: job.id,
        traceId: job.traceId,
        finalized: result.finalized,
        technicalState: result.technicalState,
        status:
          "status" in result && result.status
            ? result.status
            : "processing_technical",
      });
    } catch (error) {
      results.push({
        jobId: job.id,
        traceId: job.traceId,
        finalized: false,
        error:
          error instanceof Error ? error.message : "Technical finalization failed",
      });
    }
  }

  return NextResponse.json({
    success: true,
    checked: jobs.length,
    results,
  });
}
