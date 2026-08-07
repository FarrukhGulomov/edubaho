-- AlterTable
ALTER TABLE "InstitutionDetail" ADD COLUMN     "categories" TEXT[] DEFAULT ARRAY[]::TEXT[];
