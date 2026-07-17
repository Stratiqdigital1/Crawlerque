-- CreateEnum
CREATE TYPE "PromoAccessStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- CreateTable
CREATE TABLE "PromoAccess" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenEncrypted" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL,
    "auditLimit" INTEGER NOT NULL DEFAULT 3,
    "auditsUsed" INTEGER NOT NULL DEFAULT 0,
    "status" "PromoAccessStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromoAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PromoAccess_tokenHash_key" ON "PromoAccess"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "PromoAccess_userId_key" ON "PromoAccess"("userId");

-- CreateIndex
CREATE INDEX "PromoAccess_status_idx" ON "PromoAccess"("status");

-- CreateIndex
CREATE INDEX "PromoAccess_expiresAt_idx" ON "PromoAccess"("expiresAt");

-- CreateIndex
CREATE INDEX "PromoAccess_createdById_idx" ON "PromoAccess"("createdById");

-- CreateIndex
CREATE INDEX "PromoAccess_createdAt_idx" ON "PromoAccess"("createdAt");

-- AddForeignKey
ALTER TABLE "PromoAccess"
ADD CONSTRAINT "PromoAccess_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoAccess"
ADD CONSTRAINT "PromoAccess_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
