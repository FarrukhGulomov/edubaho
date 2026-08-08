-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACT_REQUIRED', 'CONTACTED', 'INTERESTED', 'CENTER_SELECTED', 'APPLICATION_STARTED', 'APPLICATION_SUBMITTED', 'CONVERTED', 'NOT_INTERESTED', 'LOST');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "leadStatus" "LeadStatus" NOT NULL DEFAULT 'NEW',
ADD COLUMN     "leadStatusUpdatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "User_role_leadStatus_idx" ON "User"("role", "leadStatus");

-- CreateIndex
CREATE INDEX "User_role_createdAt_idx" ON "User"("role", "createdAt");
