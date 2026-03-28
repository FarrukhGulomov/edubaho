-- Super admin userlarni yaratish yoki yangilash
-- Agar user avval login qilgan bo'lsa, faqat role yangilanadi
INSERT INTO "User" (id, phone, role, "isVerified", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, '+998909775255', 'SUPER_ADMIN'::"Role", true, true, NOW(), NOW()),
  (gen_random_uuid()::text, '+998907817877', 'SUPER_ADMIN'::"Role", true, true, NOW(), NOW())
ON CONFLICT (phone) DO UPDATE
  SET role = 'SUPER_ADMIN'::"Role",
      "isVerified" = true,
      "updatedAt" = NOW();

-- To'liq ruxsat bilan AdminPermission yaratish yoki yangilash
INSERT INTO "AdminPermission" (
  id, "adminId", "canManageAll", "institutionIds",
  "canCreateInstitutions", "canEditInstitutions", "canDeleteInstitutions",
  "canModerateReviews", "canViewUsers", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  u.id,
  true,
  ARRAY[]::text[],
  true, true, true, true, true,
  NOW(), NOW()
FROM "User" u
WHERE u.phone IN ('+998909775255', '+998907817877')
ON CONFLICT ("adminId") DO UPDATE
  SET "canManageAll" = true,
      "canCreateInstitutions" = true,
      "canEditInstitutions" = true,
      "canDeleteInstitutions" = true,
      "canModerateReviews" = true,
      "canViewUsers" = true,
      "updatedAt" = NOW();
