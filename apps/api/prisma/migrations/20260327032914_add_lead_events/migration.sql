-- CreateTable
CREATE TABLE "LeadEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "event" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "properties" JSONB,
    "institutionId" TEXT,
    "page" TEXT,
    "referrer" TEXT,
    "userAgent" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadEvent_sessionId_createdAt_idx" ON "LeadEvent"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "LeadEvent_event_createdAt_idx" ON "LeadEvent"("event", "createdAt");

-- CreateIndex
CREATE INDEX "LeadEvent_userId_createdAt_idx" ON "LeadEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LeadEvent_institutionId_event_idx" ON "LeadEvent"("institutionId", "event");

-- CreateIndex
CREATE INDEX "LeadEvent_category_createdAt_idx" ON "LeadEvent"("category", "createdAt");

-- AddForeignKey
ALTER TABLE "LeadEvent" ADD CONSTRAINT "LeadEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadEvent" ADD CONSTRAINT "LeadEvent_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;
