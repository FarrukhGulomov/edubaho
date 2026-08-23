/**
 * BilimCoin (BCN) — Bilimon platformasining ichki bonus valyutasi.
 * Referral va enrollment bonuslari shu birlikda ko'rsatiladi (kurs
 * narxlari — InstitutionPricing — bunga kirmaydi, ular hamon so'mda).
 */
export function formatBcn(n: number): string {
  return `${n.toLocaleString('ru-RU').replace(/,/g, ' ')} BCN`
}
