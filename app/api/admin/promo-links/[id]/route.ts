import {
  PromoAccessStatus,
} from "@prisma/client";
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

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getOrigin(_request: Request) {
  return "https://crawlerque.com";
}

function parseExpiry(
  value: unknown
): Date | null {
  if (
    value === null ||
    value === ""
  ) {
    return null;
  }

  const date = new Date(
    String(value)
  );

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
    accessUrl = getPromoAccessUrl(
      origin,
      decryptPromoToken(
        access.tokenEncrypted
      )
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

    const existing =
      await prisma.promoAccess.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Promotional link not found.",
        },
        {
          status: 404,
        }
      );
    }

    const accessData: any = {};
    const userData: any = {};

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "label"
      )
    ) {
      const label = String(
        body.label || ""
      ).trim();

      if (!label) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Name cannot be empty.",
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

      accessData.label = label;
      userData.name = label;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "auditLimit"
      )
    ) {
      const auditLimit = Number(
        body.auditLimit
      );

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

      accessData.auditLimit =
        auditLimit;
      userData.monthlyAudits =
        auditLimit;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "status"
      )
    ) {
      const status = String(
        body.status || ""
      ).toUpperCase();

      if (
        ![
          PromoAccessStatus.ACTIVE,
          PromoAccessStatus.PAUSED,
        ].includes(
          status as PromoAccessStatus
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid promotional link status.",
          },
          {
            status: 400,
          }
        );
      }

      accessData.status =
        status as PromoAccessStatus;

      userData.status =
        status ===
        PromoAccessStatus.ACTIVE
          ? "active"
          : "suspended";
    }

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "expiresAt"
      )
    ) {
      accessData.expiresAt =
        parseExpiry(body.expiresAt);
    }

    if (body?.resetUsage === true) {
      accessData.auditsUsed = 0;
      accessData.lastUsedAt = null;
      userData.auditsUsed = 0;
    }

    if (body?.regenerate === true) {
      const tokenData =
        createPromoToken();

      accessData.tokenHash =
        tokenData.tokenHash;
      accessData.tokenEncrypted =
        tokenData.tokenEncrypted;
      accessData.tokenPrefix =
        tokenData.tokenPrefix;
    }

    const updated =
      await prisma.$transaction(
        async (transaction) => {
          const access =
            await transaction.promoAccess.update({
              where: {
                id,
              },
              data: accessData,
            });

          if (
            Object.keys(userData)
              .length > 0
          ) {
            await transaction.user.update({
              where: {
                id:
                  existing.userId,
              },
              data: userData,
            });
          }

          return access;
        }
      );

    return NextResponse.json({
      success: true,
      link: serializePromoAccess(
        updated,
        getOrigin(request)
      ),
    });
  } catch (error) {
    console.error(
      "Promo link update failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update promotional link.",
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

    const access =
      await prisma.promoAccess.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          label: true,
          userId: true,
        },
      });

    if (!access) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Promotional link not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Deleting the hidden promotional user
     * also deletes its link, audit jobs and
     * reports through the existing cascade
     * relations.
     */
    await prisma.user.delete({
      where: {
        id: access.userId,
      },
    });

    return NextResponse.json({
      success: true,
      message: `"${access.label}" deleted successfully.`,
    });
  } catch (error) {
    console.error(
      "Promo link deletion failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to delete promotional link.",
      },
      {
        status: 500,
      }
    );
  }
}
