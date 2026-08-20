/**
 * Muassasa nomini "kalit" shaklga keltiradi — Institution.nameKey uchun.
 * Trim + kichik harf + ortiqcha bo'shliqlar bitta bo'shliqqa yig'iladi,
 * shunda "PDP Academy", " pdp  academy " va "pdp academy" bir xil
 * kalitga tushadi va DB darajasida unique constraint orqali
 * takroriy muassasa yaratilishining oldi olinadi (filiallar
 * InstitutionBranch orqali bog'lanishi kerak, alohida Institution emas).
 */
export function normalizeInstitutionName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}
