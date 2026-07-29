import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AuditUsageSource =
  | "none"
  | "admin"
  | "paid"
  | "trial"
  | "promo"
  | "free";

export type AuditUsageState =
  | "not_required"
  | "reserved"
  | "committed"
  | "refunded"
  | "legacy";

export class AuditUsageLimitError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = "AUDIT_LIMIT_REACHED") {
    super(message);
    this.name = "AuditUsageLimitError";
    this.code = code;
    this.status = 429;
  }
}

type ReserveAuditJobInput = {
  userId: string;
  role: string;
  stripeStatus?: string | null;
  monthlyLimit: number;
  promoAccessId?: string | null;
  domain: string;
  normalizedDomain: string;
  url: string;
  inputHash: string;
  reportTypes: string[];
  retryOfJobId?: string | null;
};

function makeTraceId() {
  const timePart = Date.now().toString(36).toUpperCase();
  const randomPart = randomBytes(4).toString("hex").toUpperCase();

  return `CQ-${timePart}-${randomPart}`;
}

export async function createAuditJobWithReservation(
  input: ReserveAuditJobInput
) {
  return prisma.$transaction(
    async (tx) => {
      let usageSource: AuditUsageSource = "none";
      let usageState: AuditUsageState = "not_required";
      let usageReservedAt: Date | null = null;

      if (input.role === "admin") {
        usageSource = "admin";
      } else if (input.promoAccessId) {
        const reserved = await tx.promoAccess.updateMany({
          where: {
            id: input.promoAccessId,
            status: "ACTIVE",
            auditsUsed: {
              lt: await getPromoLimit(tx, input.promoAccessId),
            },
          },
          data: {
            auditsUsed: {
              increment: 1,
            },
            lastUsedAt: new Date(),
          },
        });

        if (reserved.count !== 1) {
          throw new AuditUsageLimitError(
            "This promotional link has used all available audits.",
            "PROMO_AUDIT_LIMIT_REACHED"
          );
        }

        usageSource = "promo";
        usageState = "reserved";
        usageReservedAt = new Date();
      } else if (
        String(input.stripeStatus || "").toLowerCase() === "trialing"
      ) {
        const reserved = await tx.user.updateMany({
          where: {
            id: input.userId,
            trialAuditsUsed: {
              lt: 3,
            },
          },
          data: {
            trialAuditsUsed: {
              increment: 1,
            },
          },
        });

        if (reserved.count !== 1) {
          throw new AuditUsageLimitError(
            "Your trial audit limit has been reached.",
            "TRIAL_AUDIT_LIMIT_REACHED"
          );
        }

        usageSource = "trial";
        usageState = "reserved";
        usageReservedAt = new Date();
      } else {
        const monthlyLimit = Math.max(0, Number(input.monthlyLimit || 0));

        if (monthlyLimit < 1) {
          throw new AuditUsageLimitError(
            "Your current plan does not include any audits.",
            "PLAN_HAS_NO_AUDITS"
          );
        }

        const reserved = await tx.user.updateMany({
          where: {
            id: input.userId,
            auditsUsed: {
              lt: monthlyLimit,
            },
          },
          data: {
            auditsUsed: {
              increment: 1,
            },
          },
        });

        if (reserved.count !== 1) {
          throw new AuditUsageLimitError(
            "Your monthly audit limit has been reached.",
            "MONTHLY_AUDIT_LIMIT_REACHED"
          );
        }

        usageSource = "paid";
        usageState = "reserved";
        usageReservedAt = new Date();
      }

      return tx.auditJob.create({
        data: {
          userId: input.userId,
          domain: input.domain,
          normalizedDomain: input.normalizedDomain,
          url: input.url,
          inputHash: input.inputHash,
          reportTypes: input.reportTypes,
          status: "pending",
          progress: 1,
          currentModule: "Audit queued",
          moduleStatus: {},
          technicalTaskId: null,
          renderReady: false,
          usageCounted: false,
          traceId: makeTraceId(),
          usageSource,
          usageState,
          usageReservedAt,
          retryOfJobId: input.retryOfJobId || null,
        },
        select: {
          id: true,
          traceId: true,
          status: true,
          progress: true,
          currentModule: true,
          normalizedDomain: true,
          inputHash: true,
          renderReady: true,
          usageState: true,
          usageSource: true,
          retryOfJobId: true,
        },
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    }
  );
}

async function getPromoLimit(
  tx: Prisma.TransactionClient,
  promoAccessId: string
) {
  const promo = await tx.promoAccess.findUnique({
    where: {
      id: promoAccessId,
    },
    select: {
      auditLimit: true,
    },
  });

  if (!promo) {
    throw new AuditUsageLimitError(
      "Promotional access is unavailable.",
      "PROMO_ACCESS_UNAVAILABLE"
    );
  }

  return promo.auditLimit;
}

export async function commitAuditUsage(jobId: string) {
  return prisma.$transaction(
    async (tx) => {
      const claimed = await tx.auditJob.updateMany({
        where: {
          id: jobId,
          usageState: "reserved",
        },
        data: {
          usageState: "committing",
        },
      });

      if (claimed.count !== 1) {
        const current = await tx.auditJob.findUnique({
          where: {
            id: jobId,
          },
          select: {
            usageState: true,
          },
        });

        return {
          changed: false,
          usageState: current?.usageState || null,
        };
      }

      const committedAt = new Date();

      const job = await tx.auditJob.update({
        where: {
          id: jobId,
        },
        data: {
          usageState: "committed",
          usageCounted: true,
          usageCommittedAt: committedAt,
          usageRefundedAt: null,
        },
        select: {
          usageState: true,
          usageSource: true,
        },
      });

      return {
        changed: true,
        usageState: job.usageState,
        usageSource: job.usageSource,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    }
  );
}

export async function refundAuditUsage(jobId: string) {
  return prisma.$transaction(
    async (tx) => {
      const claimed = await tx.auditJob.updateMany({
        where: {
          id: jobId,
          usageState: "reserved",
        },
        data: {
          usageState: "refunding",
        },
      });

      if (claimed.count !== 1) {
        const current = await tx.auditJob.findUnique({
          where: {
            id: jobId,
          },
          select: {
            usageState: true,
          },
        });

        return {
          changed: false,
          usageState: current?.usageState || null,
        };
      }

      const job = await tx.auditJob.findUnique({
        where: {
          id: jobId,
        },
        select: {
          userId: true,
          usageSource: true,
        },
      });

      if (!job) {
        throw new Error("Audit job not found while restoring its credit.");
      }

      if (job.usageSource === "promo" && job.userId) {
        const promo = await tx.promoAccess.findUnique({
          where: {
            userId: job.userId,
          },
          select: {
            id: true,
          },
        });

        if (promo) {
          await tx.promoAccess.updateMany({
            where: {
              id: promo.id,
              auditsUsed: {
                gt: 0,
              },
            },
            data: {
              auditsUsed: {
                decrement: 1,
              },
            },
          });
        }
      } else if (job.usageSource === "trial" && job.userId) {
        await tx.user.updateMany({
          where: {
            id: job.userId,
            trialAuditsUsed: {
              gt: 0,
            },
          },
          data: {
            trialAuditsUsed: {
              decrement: 1,
            },
          },
        });
      } else if (job.usageSource === "paid" && job.userId) {
        await tx.user.updateMany({
          where: {
            id: job.userId,
            auditsUsed: {
              gt: 0,
            },
          },
          data: {
            auditsUsed: {
              decrement: 1,
            },
          },
        });
      }

      const refundedAt = new Date();

      const updated = await tx.auditJob.update({
        where: {
          id: jobId,
        },
        data: {
          usageState: "refunded",
          usageCounted: false,
          usageRefundedAt: refundedAt,
          usageCommittedAt: null,
        },
        select: {
          usageState: true,
          usageSource: true,
        },
      });

      return {
        changed: true,
        usageState: updated.usageState,
        usageSource: updated.usageSource,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    }
  );
}

type FailAuditInput = {
  jobId: string;
  failureCode: string;
  internalError: string;
  userMessage: string;
  currentModule?: string;
};

export async function failAuditAndRestoreCredit(
  input: FailAuditInput
) {
  await refundAuditUsage(input.jobId);

  return prisma.auditJob.update({
    where: {
      id: input.jobId,
    },
    data: {
      status: "failed",
      progress: 100,
      currentModule: input.currentModule || "Audit failed",
      failureCode: input.failureCode,
      error: input.internalError,
      userMessage: input.userMessage,
      failedAt: new Date(),
      completedAt: null,
      renderReady: false,
    },
  });
}

export async function cancelAuditAndRestoreCredit(jobId: string) {
  await refundAuditUsage(jobId);

  return prisma.auditJob.update({
    where: {
      id: jobId,
    },
    data: {
      status: "cancelled",
      progress: 100,
      currentModule: "Audit cancelled",
      failureCode: "AUDIT_CANCELLED",
      error: "The user cancelled the audit.",
      userMessage: "Audit cancelled. Your audit credit was restored.",
      cancelledAt: new Date(),
      failedAt: null,
      completedAt: null,
      renderReady: false,
    },
  });
}
