-- AlterTable: nullable first — mavjud qatorlarni to'ldirgandan keyin NOT NULL qilinadi
ALTER TABLE "Institution" ADD COLUMN "nameKey" TEXT;

-- Backfill: mavjud nameUz'lardan normallashtirilgan kalit hisoblanadi
UPDATE "Institution"
SET "nameKey" = lower(regexp_replace(trim(both from "nameUz"), '\s+', ' ', 'g'));

-- Filiallar (InstitutionBranch) qo'llab-quvvatlanishidan OLDIN bir xil
-- muassasa har bir shahar uchun alohida Institution sifatida qo'shilgan
-- bo'lishi mumkin — bunday mavjud takrorlanishlar UNIQUE cheklovi
-- yaratilishida deploy'ni buzmasligi uchun suffiks bilan farqlanadi.
-- Admin keyinchalik "Birlashtirish" vositasi orqali bularni bitta
-- muassasaning filiallariga aylantirishi mumkin.
WITH ranked AS (
  SELECT "id",
         ROW_NUMBER() OVER (PARTITION BY "nameKey" ORDER BY "createdAt" ASC, "id" ASC) AS rn
  FROM "Institution"
)
-- To'liq "id" (jadval PK'i, har doim noyob) ishlatiladi — qisqartirilgan
-- prefiks ishlatilsa, id'lari bir xil boshlanuvchi qatorlarda yana
-- to'qnashuv yuzaga kelishi mumkin edi
UPDATE "Institution" i
SET "nameKey" = i."nameKey" || '-' || i."id"
FROM ranked r
WHERE i."id" = r."id" AND r.rn > 1;

-- AlterTable: endi har bir qatorda qiymat mavjud
ALTER TABLE "Institution" ALTER COLUMN "nameKey" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Institution_nameKey_key" ON "Institution"("nameKey");
