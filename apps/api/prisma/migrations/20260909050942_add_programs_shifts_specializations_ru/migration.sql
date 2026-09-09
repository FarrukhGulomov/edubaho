-- AlterTable
ALTER TABLE "InstitutionDetail" ADD COLUMN     "programsRu" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "shiftsRu" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "specializationsRu" TEXT[] DEFAULT ARRAY[]::TEXT[];
