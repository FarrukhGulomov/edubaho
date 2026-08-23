-- CreateEnum
CREATE TYPE "EnrollmentClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "EnrollmentClaim" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "courseNote" TEXT,
    "receiptUrl" TEXT,
    "status" "EnrollmentClaimStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnrollmentClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrollmentReward" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "ReferralRewardStatus" NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnrollmentReward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EnrollmentClaim_institutionId_status_idx" ON "EnrollmentClaim"("institutionId", "status");

-- CreateIndex
CREATE INDEX "EnrollmentClaim_userId_status_idx" ON "EnrollmentClaim"("userId", "status");

-- CreateIndex
CREATE INDEX "EnrollmentClaim_status_createdAt_idx" ON "EnrollmentClaim"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentReward_claimId_key" ON "EnrollmentReward"("claimId");

-- CreateIndex
CREATE INDEX "EnrollmentReward_userId_status_idx" ON "EnrollmentReward"("userId", "status");

-- AddForeignKey
ALTER TABLE "EnrollmentClaim" ADD CONSTRAINT "EnrollmentClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentClaim" ADD CONSTRAINT "EnrollmentClaim_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentReward" ADD CONSTRAINT "EnrollmentReward_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "EnrollmentClaim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentReward" ADD CONSTRAINT "EnrollmentReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
