ALTER TABLE "AuditJob"
ADD COLUMN "traceId" TEXT,
ADD COLUMN "usageSource" TEXT,
ADD COLUMN "usageState" TEXT NOT NULL DEFAULT 'legacy',
ADD COLUMN "usageReservedAt" TIMESTAMP(3),
ADD COLUMN "usageCommittedAt" TIMESTAMP(3),
ADD COLUMN "usageRefundedAt" TIMESTAMP(3),
ADD COLUMN "failureCode" TEXT,
ADD COLUMN "userMessage" TEXT,
ADD COLUMN "retryOfJobId" TEXT,
ADD COLUMN "cancelledAt" TIMESTAMP(3);

UPDATE "AuditJob"
SET "traceId" = 'CQ-LEGACY-' || UPPER(SUBSTRING(MD5("id") FROM 1 FOR 12))
WHERE "traceId" IS NULL;

ALTER TABLE "AuditJob"
ALTER COLUMN "traceId" SET NOT NULL;

CREATE UNIQUE INDEX "AuditJob_traceId_key"
ON "AuditJob"("traceId");

CREATE INDEX "AuditJob_usageState_idx"
ON "AuditJob"("usageState");

CREATE INDEX "AuditJob_retryOfJobId_idx"
ON "AuditJob"("retryOfJobId");

CREATE INDEX "AuditJob_userId_status_createdAt_idx"
ON "AuditJob"("userId", "status", "createdAt");
