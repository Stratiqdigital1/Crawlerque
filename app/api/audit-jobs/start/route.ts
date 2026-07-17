import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  verifySessionToken,
} from "@/lib/auth";
import {
  withSecurityHeaders,
} from "@/lib/security-headers";
import {
  getPromoAccessForSession,
  PROMO_REPORT_TYPES,
} from "@/lib/promo-access";

async function getSessionFromCookie() {
  const cookieStore =
    await cookies();

  const token = cookieStore.get(
    "stratiq_session"
  )?.value;

  if (!token) {
    return null;
  }

  try {
    const payload: any =
      await verifySessionToken(token);

    if (!payload?.userId) {
      return null;
    }

    return {
      id: String(
        payload.userId
      ),
      role: String(
        payload.role || "user"
      ),
      promoAccessId:
        payload.promoAccessId
          ? String(
              payload.promoAccessId
            )
          : null,
    };
  } catch {
    return null;
  }
}

function extractDomainFromUrl(
  input: string
) {
  try {
    const withProtocol =
      /^https?:\/\//i.test(input)
        ? input
        : `https://${input}`;

    return new URL(
      withProtocol
    ).hostname.replace(
      /^www\./,
      ""
    );
  } catch {
    return input
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0];
  }
}

export async function POST(
  req: Request
) {
  try {
    const session =
      await getSessionFromCookie();

    if (!session) {
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

    const promoAccess =
      session.promoAccessId
        ? await getPromoAccessForSession({
            userId: session.id,
            promoAccessId:
              session.promoAccessId,
          })
        : null;

    if (
      session.promoAccessId &&
      !promoAccess
    ) {
      return withSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error:
              "Promotional access is unavailable.",
          },
          {
            status: 403,
          }
        )
      );
    }

    if (
      promoAccess &&
      promoAccess.auditsUsed >=
        promoAccess.auditLimit
    ) {
      return withSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error:
              "This promotional link has used all available audits.",
          },
          {
            status: 429,
          }
        )
      );
    }

    const body = await req.json();

    const url = String(
      body?.url || ""
    );

    const reportTypes =
      promoAccess
        ? [...PROMO_REPORT_TYPES]
        : Array.isArray(
              body?.reportTypes
            )
          ? body.reportTypes
          : [];

    if (!url) {
      return withSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error:
              "URL is required.",
          },
          {
            status: 400,
          }
        )
      );
    }

    const job =
      await prisma.auditJob.create({
        data: {
          userId: session.id,
          domain:
            extractDomainFromUrl(
              url
            ),
          url,
          reportTypes,
          status: "pending",
          progress: 1,
          currentModule:
            "Audit queued",
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
    console.error(
      "Audit job start failed:",
      error
    );

    return withSecurityHeaders(
      NextResponse.json(
        {
          success: false,
          error:
            "Failed to start audit job.",
        },
        {
          status: 500,
        }
      )
    );
  }
}
