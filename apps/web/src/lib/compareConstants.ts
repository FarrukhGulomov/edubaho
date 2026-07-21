/**
 * Solishtirish bo'yicha umumiy sonli konstantalar.
 *
 * Alohida, "use client" belgisiz faylda saqlanadi — Server Component'lar
 * (masalan compare/page.tsx) ham bemalol import qila oladi. "use client"
 * fayldan (useCompare.tsx) shunchaki son import qilish Next.js'da
 * server/client chegarasini buzib, qiymatni noto'g'ri serializatsiya
 * qilishi mumkin.
 */
export const MAX_COMPARE = 4
