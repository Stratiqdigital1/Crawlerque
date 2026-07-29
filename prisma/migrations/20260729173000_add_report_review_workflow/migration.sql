CREATE TABLE "AuditReportReview" (
  "id" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "version" INTEGER NOT NULL DEFAULT 1,
  "approvedVersion" INTEGER,
  "draftData" JSONB NOT NULL,
  "approvedData" JSONB,
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT NOT NULL,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AuditReportReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditReportReviewRevision" (
  "id" TEXT NOT NULL,
  "reviewId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "action" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "actorId" TEXT,
  "actorName" TEXT,
  "actorEmail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuditReportReviewRevision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuditReportReview_reportId_key"
ON "AuditReportReview"("reportId");

CREATE INDEX "AuditReportReview_status_idx"
ON "AuditReportReview"("status");

CREATE INDEX "AuditReportReview_approvedAt_idx"
ON "AuditReportReview"("approvedAt");

CREATE UNIQUE INDEX "AuditReportReviewRevision_reviewId_version_key"
ON "AuditReportReviewRevision"("reviewId", "version");

CREATE INDEX "AuditReportReviewRevision_reviewId_createdAt_idx"
ON "AuditReportReviewRevision"("reviewId", "createdAt");

CREATE INDEX "AuditReportReviewRevision_actorId_createdAt_idx"
ON "AuditReportReviewRevision"("actorId", "createdAt");

ALTER TABLE "AuditReportReview"
ADD CONSTRAINT "AuditReportReview_reportId_fkey"
FOREIGN KEY ("reportId") REFERENCES "AuditReport"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuditReportReview"
ADD CONSTRAINT "AuditReportReview_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AuditReportReview"
ADD CONSTRAINT "AuditReportReview_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AuditReportReview"
ADD CONSTRAINT "AuditReportReview_approvedById_fkey"
FOREIGN KEY ("approvedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AuditReportReviewRevision"
ADD CONSTRAINT "AuditReportReviewRevision_reviewId_fkey"
FOREIGN KEY ("reviewId") REFERENCES "AuditReportReview"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuditReportReviewRevision"
ADD CONSTRAINT "AuditReportReviewRevision_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
