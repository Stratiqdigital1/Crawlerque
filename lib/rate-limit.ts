// lib/rate-limit.ts
// Database-backed rate limiting for free audits.
// Uses the AuditLog table so limits survive serverless cold starts
// and work correctly across multiple instances.

import { prisma } from "@/lib/prisma";

export async function checkFreeAuditRateLimit(ip: string): Promise<{
  allowed: boolean;
  remaining: number;
}> {
  const LIMIT = 2;
  const windowMs = 24 * 60 * 60 * 1000; // 24 hours
  const since = new Date(Date.now() - windowMs);

  const count = await prisma.auditLog.count({
    where: {
      ip,
      auditMode: "free",
      createdAt: { gte: since },
      status: { in: ["success", "blocked"] },
    },
  });

  return {
    allowed: count < LIMIT,
    remaining: Math.max(0, LIMIT - count),
  };
}