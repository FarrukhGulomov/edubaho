-- CreateEnum
CREATE TYPE "DeliveryMode" AS ENUM ('OFFLINE', 'ONLINE', 'HYBRID');

-- AlterTable
ALTER TABLE "Institution" ADD COLUMN     "deliveryMode" "DeliveryMode" NOT NULL DEFAULT 'OFFLINE';
