ALTER TABLE "AuditReport"
ADD COLUMN "auditJobId" TEXT,
ADD COLUMN "inputHash" TEXT,
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'processing',
ADD COLUMN "renderReady" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "moduleStatus" JSONB,
ADD COLUMN "completedAt" TIMESTAMP(3);

ALTER TABLE "AuditJob"
ADD COLUMN "normalizedDomain" TEXT,
ADD COLUMN "inputHash" TEXT,
ADD COLUMN "technicalTaskId" TEXT,
ADD COLUMN "renderReady" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "usageCounted" BOOLEAN NOT NULL DEFAULT false;

-- Preserve old completed reports so that existing history remains usable.
UPDATE "AuditReport"
SET
  "status" = 'completed',
  "renderReady" = true,
  "completedAt" = COALESCE("updatedAt", "createdAt");

-- Preserve existing completed jobs and normalize their domains.
UPDATE "AuditJob"
SET
  "normalizedDomain" = LOWER("domain"),
  "renderReady" = CASE
    WHEN "status" = 'completed' THEN true
    ELSE false
  END;

CREATE UNIQUE INDEX "AuditReport_auditJobId_key"
ON "AuditReport"("auditJobId");

CREATE INDEX "AuditReport_status_renderReady_idx"
ON "AuditReport"("status", "renderReady");

CREATE INDEX "AuditJob_userId_normalizedDomain_createdAt_idx"
ON "AuditJob"("userId", "normalizedDomain", "createdAt");

CREATE INDEX "AuditJob_inputHash_idx"
ON "AuditJob"("inputHash");