import {
  PromoAccessStatus,
} from "@prisma/client";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import {
  requireAdminApi,
} from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import {
  createPromoToken,
  decryptPromoToken,
  getPromoAccessUrl,
  isPromoAccessExpired,
} from "@/lib/promo-access";

export const runtime = "nodejs";

function getOrigin(_request: Request) {
  return "https://crawlerque.com";
}

function parseExpiry(value: unknown) {
  const normalized = String(
    value || ""
  ).trim();

  if (!normalized) {
    return null;
  }

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    throw new Error(
      "Expiry date is invalid."
    );
  }

  if (date.getTime() <= Date.now()) {
    throw new Error(
      "Expiry date must be in the future."
    );
  }

  return date;
}

function serializePromoAccess(
  access: {
    id: string;
    label: string;
    tokenEncrypted: string;
    tokenPrefix: string;
    auditLimit: number;
    auditsUsed: number;
    status: PromoAccessStatus;
    expiresAt: Date | null;
    lastUsedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  },
  origin: string
) {
  let accessUrl: string | null = null;

  try {
    const token = decryptPromoToken(
      access.tokenEncrypted
    );

    accessUrl = getPromoAccessUrl(
      origin,
      token
    );
  } catch (error) {
    console.error(
      "Promo token decryption failed:",
      {
        promoAccessId: access.id,
        error,
      }
    );
  }

  return {
    id: access.id,
    label: access.label,
    tokenPrefix:
      access.tokenPrefix,
    accessUrl,
    auditLimit:
      access.auditLimit,
    auditsUsed:
      access.auditsUsed,
    auditsRemaining: Math.max(
      0,
      access.auditLimit -
        access.auditsUsed
    ),
    status: access.status,
    expired:
      isPromoAccessExpired(
        access.expiresAt
      ),
    expiresAt:
      access.expiresAt,
    lastUsedAt:
      access.lastUsedAt,
    createdAt: access.createdAt,
    updatedAt: access.updatedAt,
  };
}

export async function GET(
  request: Request
) {
  const { errorResponse } =
    await requireAdminApi();

  if (errorResponse) {
    return errorResponse;
  }

  try {
    const links =
      await prisma.promoAccess.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });

    const origin = getOrigin(request);

    return NextResponse.json({
      success: true,
      links: links.map((link) =>
        serializePromoAccess(
          link,
          origin
        )
      ),
    });
  } catch (error) {
    console.error(
      "Promo link listing failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to load promotional links.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  request: Request
) {
  const { adminUser, errorResponse } =
    await requireAdminApi();

  if (errorResponse) {
    return errorResponse;
  }

  if (!adminUser) {
    return NextResponse.json(
      {
        success: false,
        error: "Admin access required.",
      },
      {
        status: 403,
      }
    );
  }

  try {
    const body = await request.json();

    const label = String(
      body?.label || ""
    ).trim();

    const auditLimit = Number(
      body?.auditLimit ?? 3
    );

    if (!label) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Recipient or campaign name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (label.length > 120) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Name cannot exceed 120 characters.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isInteger(auditLimit) ||
      auditLimit < 1 ||
      auditLimit > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Audit limit must be between 1 and 100.",
        },
        {
          status: 400,
        }
      );
    }

    const expiresAt = parseExpiry(
      body?.expiresAt
    );

    const tokenData =
      createPromoToken();

    const email =
      `promo-${randomUUID()}@access.crawlerque.local`;

    const created =
      await prisma.$transaction(
        async (transaction) => {
          const user =
            await transaction.user.create({
              data: {
                name: label,
                email,
                passwordHash:
                  "PROMO_ACCESS_ONLY_NO_PASSWORD_LOGIN",
                role: "user",
                status: "active",
                mustChangePassword: false,
                packageName:
                  "Promotional Full Access",
                auditsUsed: 0,
                monthlyAudits:
                  auditLimit,
                allowPdf: true,
                allowAi: true,
                allowTraffic: true,
                allowKeywords: true,
                allowBacklinks: true,
                allowLocalSeo: true,
                allowWhiteLabel: false,
                stripeStatus: "promo",
              },
            });

          return transaction.promoAccess.create({
            data: {
              label,
              tokenHash:
                tokenData.tokenHash,
              tokenEncrypted:
                tokenData.tokenEncrypted,
              tokenPrefix:
                tokenData.tokenPrefix,
              auditLimit,
              auditsUsed: 0,
              status:
                PromoAccessStatus.ACTIVE,
              expiresAt,
              userId: user.id,
              createdById:
                adminUser.id,
            },
          });
        }
      );

    const origin = getOrigin(request);

    return NextResponse.json(
      {
        success: true,
        link: serializePromoAccess(
          created,
          origin
        ),
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Promo link creation failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create promotional link.",
      },
      {
        status: 500,
      }
    );
  }
}
