-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phoneVerifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "LeadEvent_userId_event_idx" ON "LeadEvent"("userId", "event");

