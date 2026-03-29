-- CreateTable
CREATE TABLE "InstitutionBranch" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "nameUz" TEXT,
    "nameRu" TEXT,
    "cityId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "phone" TEXT,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstitutionBranch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InstitutionBranch_institutionId_idx" ON "InstitutionBranch"("institutionId");

-- CreateIndex
CREATE INDEX "InstitutionBranch_cityId_idx" ON "InstitutionBranch"("cityId");

-- CreateIndex
CREATE INDEX "InstitutionBranch_regionId_idx" ON "InstitutionBranch"("regionId");

-- AddForeignKey
ALTER TABLE "InstitutionBranch" ADD CONSTRAINT "InstitutionBranch_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionBranch" ADD CONSTRAINT "InstitutionBranch_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionBranch" ADD CONSTRAINT "InstitutionBranch_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
