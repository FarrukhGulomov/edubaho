-- CreateTable
CREATE TABLE "BcnAdjustment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BcnAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BcnAdjustment_userId_idx" ON "BcnAdjustment"("userId");

-- CreateIndex
CREATE INDEX "BcnAdjustment_createdAt_idx" ON "BcnAdjustment"("createdAt");

-- AddForeignKey
ALTER TABLE "BcnAdjustment" ADD CONSTRAINT "BcnAdjustment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
