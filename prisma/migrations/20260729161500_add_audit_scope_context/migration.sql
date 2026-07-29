ALTER TABLE "AuditReport"
ADD COLUMN "auditConfig" JSONB;

ALTER TABLE "AuditJob"
ADD COLUMN "auditConfig" JSONB;

-- Existing reports/jobs remain legacy and are not assigned guessed scope data.
-- New audits persist an explicit country, language, device, search engine,
-- crawl limit, and content-analysis limit.

CREATE INDEX "AuditReport_userId_inputHash_createdAt_idx"
ON "AuditReport"("userId", "inputHash", "createdAt");
