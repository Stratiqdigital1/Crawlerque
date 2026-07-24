import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { withSecurityHeaders } from "@/lib/security-headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SessionUser = {
  id: string;
  role: string;
};

type JsonRecord = Record<
  string,
  unknown
>;

function isRecord(
  value: unknown
): value is JsonRecord {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function normalizeDomain(
  value: unknown
) {
  const raw = String(value || "")
    .trim()
    .toLowerCase();

  if (!raw) {
    return "";
  }

  try {
    const parsed = new URL(
      /^https?:\/\//i.test(raw)
        ? raw
        : `https://${raw}`
    );

    return parsed.hostname
      .replace(/^www\./, "")
      .replace(/\.$/, "");
  } catch {
    return raw
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split(/[/?#]/)[0]
      .replace(/\.$/, "");
  }
}

function getReportTypesKey(
  value: unknown
) {
  if (!Array.isArray(value)) {
    return "";
  }

  return Array.from(
    new Set(
      value
        .map((item) =>
          String(item || "").trim()
        )
        .filter(Boolean)
    )
  )
    .sort((a, b) =>
      a.localeCompare(b)
    )
    .join("|");
}

function getReportVersion(
  value: unknown
) {
  if (!isRecord(value)) {
    return "legacy-v1";
  }

  const version =
    value.reportVersion ||
    value.schemaVersion ||
    value.auditVersion;

  return String(
    version || "legacy-v1"
  );
}

async function getUserFromCookie(): Promise<SessionUser | null> {
  const cookieStore = await cookies();

  const token = cookieStore.get(
    "stratiq_session"
  )?.value;

  if (!token) {
    return null;
  }

  try {
    const payload =
      await verifySessionToken(token);

    if (!payload?.userId) {
      return null;
    }

    return {
      id: String(payload.userId),
      role: String(
        payload.role || "user"
      ),
    };
  } catch {
    return null;
  }
}

export async function POST(
  req: Request
) {
  try {
    const user =
      await getUserFromCookie();

    if (!user) {
      return withSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error: "Unauthorized",
          },
          {
            status: 401,
          }
        )
      );
    }

    const body =
      await req.json();

    const reportAId =
      String(
        body?.reportAId || ""
      ).trim();

    const reportBId =
      String(
        body?.reportBId || ""
      ).trim();

    if (
      !reportAId ||
      !reportBId
    ) {
      return withSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error:
              "Select two reports to compare.",
          },
          {
            status: 400,
          }
        )
      );
    }

    if (
      reportAId === reportBId
    ) {
      return withSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error:
              "Select two different audit reports.",
          },
          {
            status: 400,
          }
        )
      );
    }

    const reports =
      await prisma.auditReport.findMany({
        where: {
          id: {
            in: [
              reportAId,
              reportBId,
            ],
          },

          ...(user.role === "admin"
            ? {}
            : {
                userId: user.id,
              }),

          status: "completed",
          renderReady: true,
        },
      });

    if (reports.length !== 2) {
      return withSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error:
              "Both reports must be completed and export-ready before comparison.",
          },
          {
            status: 409,
          }
        )
      );
    }

    const reportA =
      reports.find(
        (report) =>
          report.id === reportAId
      );

    const reportB =
      reports.find(
        (report) =>
          report.id === reportBId
      );

    if (
      !reportA ||
      !reportB
    ) {
      return withSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error:
              "Comparison reports were not found.",
          },
          {
            status: 404,
          }
        )
      );
    }

    const domainA =
      normalizeDomain(
        reportA.normalizedDomain ||
          reportA.domain
      );

    const domainB =
      normalizeDomain(
        reportB.normalizedDomain ||
          reportB.domain
      );

    if (
      !domainA ||
      !domainB ||
      domainA !== domainB
    ) {
      return withSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error:
              "Reports can only be compared when they belong to the same normalized domain.",
          },
          {
            status: 409,
          }
        )
      );
    }

    const reportTypesA =
      getReportTypesKey(
        reportA.reportTypes
      );

    const reportTypesB =
      getReportTypesKey(
        reportB.reportTypes
      );

    if (
      reportTypesA !== reportTypesB
    ) {
      return withSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error:
              "These reports used different audit modules and cannot be compared reliably.",
          },
          {
            status: 409,
          }
        )
      );
    }

    const versionA =
      getReportVersion(
        reportA.reportData
      );

    const versionB =
      getReportVersion(
        reportB.reportData
      );

    if (
      versionA !== versionB
    ) {
      return withSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error:
              "These reports use different audit versions and cannot be compared reliably.",
          },
          {
            status: 409,
          }
        )
      );
    }

    return withSecurityHeaders(
      NextResponse.json({
        success: true,

        comparison: {
          normalizedDomain:
            domainA,

          reportVersion:
            versionA,

          reportTypes:
            Array.isArray(
              reportA.reportTypes
            )
              ? reportA.reportTypes
              : [],
        },

        reportA,
        reportB,
      })
    );
  } catch (error) {
    console.error(
      "Report comparison failed:",
      error
    );

    return withSecurityHeaders(
      NextResponse.json(
        {
          success: false,
          error:
            "Failed to compare reports.",
        },
        {
          status: 500,
        }
      )
    );
  }
}