-- AlterTable
ALTER TABLE "Institution" ADD COLUMN     "additionalTypes" "InstitutionType"[] DEFAULT ARRAY[]::"InstitutionType"[];
