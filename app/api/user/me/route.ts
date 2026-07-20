import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifySessionToken,
} from "@/lib/auth";
import {
  getPromoAccessForSession,
} from "@/lib/promo-access";
import {
  getAnalyticsUserId,
} from "@/lib/analytics-user-id";

export async function GET() {
  try {
    const cookieStore =
      await cookies();

    const token = cookieStore.get(
      "stratiq_session"
    )?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          user: null,
        },
        {
          status: 401,
        }
      );
    }

    const payload: any =
      await verifySessionToken(token);

    const user =
      await prisma.user.findUnique({
        where: {
          id: String(
            payload.userId
          ),
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          packageName: true,
          monthlyAudits: true,
          auditsUsed: true,
          allowPdf: true,
          allowAi: true,
          allowTraffic: true,
          allowKeywords: true,
          allowBacklinks: true,
          allowLocalSeo: true,
          allowWhiteLabel: true,
          agencyName: true,
          companyName: true,
          brandLogoUrl: true,
          brandColor: true,
          pdfFooterText: true,
          whiteLabelEnabled: true,
          packageId: true,
          stripeStatus: true,
          stripeCurrentPeriodEnd: true,
          stripeCancelAtPeriodEnd: true,
          trialAuditsUsed: true,
          package: {
            select: {
              id: true,
              name: true,
              priceMonthly: true,
              monthlyAudits: true,
              allowPdf: true,
              allowAi: true,
              allowTraffic: true,
              allowKeywords: true,
              allowBacklinks: true,
              allowLocalSeo: true,
              allowWhiteLabel: true,
              allowComparisonReports:
                true,
              historyDays: true,
              seatLimit: true,
              prioritySupport: true,
            },
          },
        },
      });

    if (
      !user ||
      user.status === "suspended"
    ) {
      return NextResponse.json(
        {
          success: false,
          user: null,
        },
        {
          status: 401,
        }
      );
    }

    const isPromoSession = Boolean(
      payload?.promoAccessId
    );

    if (isPromoSession) {
      const promoAccess =
        await getPromoAccessForSession(
          payload
        );

      if (!promoAccess) {
        return NextResponse.json(
          {
            success: false,
            user: null,
            error:
              "Promotional access is unavailable.",
          },
          {
            status: 403,
          }
        );
      }

      const auditLimit =
        promoAccess.auditLimit;

      const auditsUsed =
        promoAccess.auditsUsed;

      const auditsRemaining =
        Math.max(
          0,
          auditLimit - auditsUsed
        );

      const usagePercent =
        auditLimit > 0
          ? Math.min(
              100,
              Math.round(
                (auditsUsed /
                  auditLimit) *
                  100
              )
            )
          : 0;

      return NextResponse.json({
        success: true,
        user: {
          ...user,
          email: "",
          isPromoAccess: true,
          promoAccess: {
            id:
              promoAccess.id,
            label:
              promoAccess.label,
            auditLimit,
            auditsUsed,
            auditsRemaining,
            status:
              promoAccess.status,
            expiresAt:
              promoAccess.expiresAt,
          },
          packageName:
            "Promotional Full Access",
          monthlyAudits:
            auditLimit,
          auditsUsed,
          auditsRemaining,
          usagePercent,
          allowPdf: true,
          allowAi: true,
          allowTraffic: true,
          allowKeywords: true,
          allowBacklinks: true,
          allowLocalSeo: true,
          allowWhiteLabel: false,
          canUseWhiteLabel: false,
          whiteLabelEnabled: false,
          agencyName: null,
          companyName: null,
          brandLogoUrl: null,
          brandColor: "#C5FF3D",
          pdfFooterText: null,
          stripeStatus: "promo",
          trial: {
            isTrialing: false,
          },
          analytics: {
            enabled: false,
          },
          package: {
            id: "promo-access",
            name:
              "Promotional Full Access",
            priceMonthly: 0,
            monthlyAudits:
              auditLimit,
            allowPdf: true,
            allowAi: true,
            allowTraffic: true,
            allowKeywords: true,
            allowBacklinks: true,
            allowLocalSeo: true,
            allowWhiteLabel: false,
            allowWhiteLabelPdf: false,
            allowComparisonReports:
              true,
            historyDays: 30,
            seatLimit: 1,
            prioritySupport: false,
          },
        },
      });
    }

    const packageName =
      user.package?.name ||
      user.packageName ||
      "";

    const canUseWhiteLabel =
      user.role === "admin" ||
      packageName.toLowerCase() ===
        "agency" ||
      packageName.toLowerCase() ===
        "enterprise" ||
      user.package?.allowWhiteLabel ===
        true ||
      user.allowWhiteLabel === true;

    const monthlyLimit =
      user.package?.monthlyAudits ||
      user.monthlyAudits ||
      0;

    const auditsUsed =
      user.auditsUsed || 0;

    const auditsRemaining =
      user.role === "admin"
        ? 999
        : Math.max(
            0,
            monthlyLimit - auditsUsed
          );

    const usagePercent =
      user.role === "admin"
        ? 0
        : monthlyLimit > 0
          ? Math.min(
              100,
              Math.round(
                (auditsUsed /
                  monthlyLimit) *
                  100
              )
            )
          : 0;

    const isTrialing =
      user.stripeStatus === "trialing";

    const isExpiredTrial =
      user.packageName === "Trial" &&
      user.stripeStatus === "canceled";

    const normalizedPackageName =
      packageName.trim().toLowerCase();

    const normalizedStripeStatus = String(
      user.stripeStatus || ""
    ).toLowerCase();

    const isTrackableCustomer =
      user.role !== "admin" &&
      ["active", "trialing"].includes(
        normalizedStripeStatus
      ) &&
      Boolean(normalizedPackageName) &&
      ![
        "free",
        "promotional full access",
      ].includes(normalizedPackageName);

    const analytics = isTrackableCustomer
      ? {
          enabled: true,
          userId: getAnalyticsUserId(user.id),
          accountType: isTrialing
            ? ("trial" as const)
            : ("paid" as const),
          planName: packageName,
        }
      : {
          enabled: false,
        };

    const TRIAL_AUDIT_LIMIT = 3;

    const trialInfo =
      isTrialing || isExpiredTrial
        ? {
            isTrialing: true,
            expired:
              isExpiredTrial,
            auditsUsed:
              user.trialAuditsUsed ||
              0,
            auditsLimit:
              TRIAL_AUDIT_LIMIT,
            auditsRemaining:
              Math.max(
                0,
                TRIAL_AUDIT_LIMIT -
                  (user.trialAuditsUsed ||
                    0)
              ),
            trialEndsAt:
              user.stripeCurrentPeriodEnd,
            daysRemaining:
              isExpiredTrial
                ? 0
                : user.stripeCurrentPeriodEnd
                  ? Math.max(
                      0,
                      Math.ceil(
                        (new Date(
                          user.stripeCurrentPeriodEnd
                        ).getTime() -
                          Date.now()) /
                          (1000 *
                            60 *
                            60 *
                            24)
                      )
                    )
                  : 0,
          }
        : {
            isTrialing: false,
          };

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        isPromoAccess: false,
        auditsRemaining:
          isTrialing
            ? trialInfo.auditsRemaining
            : auditsRemaining,
        usagePercent:
          isTrialing
            ? Math.min(
                100,
                Math.round(
                  ((user.trialAuditsUsed ||
                    0) /
                    TRIAL_AUDIT_LIMIT) *
                    100
                )
              )
            : usagePercent,
        trial: trialInfo,
        analytics,
        canUseWhiteLabel,
        whiteLabelEnabled:
          canUseWhiteLabel &&
          user.whiteLabelEnabled,
        agencyName:
          canUseWhiteLabel
            ? user.agencyName
            : null,
        companyName:
          canUseWhiteLabel
            ? user.companyName
            : null,
        brandLogoUrl:
          canUseWhiteLabel
            ? user.brandLogoUrl
            : null,
        brandColor:
          canUseWhiteLabel
            ? user.brandColor ||
              "#C5FF3D"
            : "#C5FF3D",
        pdfFooterText:
          canUseWhiteLabel
            ? user.pdfFooterText
            : null,
        package: user.package
          ? {
              ...user.package,
              allowWhiteLabelPdf:
                user.package
                  .allowWhiteLabel,
            }
          : {
              name:
                user.packageName,
              monthlyAudits:
                user.monthlyAudits,
              allowPdf:
                user.allowPdf,
              allowAi:
                user.allowAi,
              allowTraffic:
                user.allowTraffic,
              allowKeywords:
                user.allowKeywords,
              allowBacklinks:
                user.allowBacklinks,
              allowLocalSeo:
                user.allowLocalSeo,
              allowWhiteLabel:
                user.allowWhiteLabel,
              allowWhiteLabelPdf:
                user.allowWhiteLabel,
            },
      },
    });
  } catch (error) {
    console.error(
      "Current user lookup failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        user: null,
      },
      {
        status: 401,
      }
    );
  }
}
