/**
 * BilimCoin (BCN) — Bilimon platformasining ichki bonus valyutasi.
 *
 * Referral va enrollment bonuslari ENDI so'mda emas, BilimCoin'da
 * hisoblanadi (1 BCN = 1 so'm qiymatga teng — yechib olishda shuncha
 * so'm sifatida to'lanadi, Payme/Click/Uzcard/Humo/Naqd orqali,
 * apps/api/src/routes/referrals.ts). Bu FAQAT bonus/hamyon tizimiga
 * tegishli — kurs narxlari (InstitutionPricing) BUNGA KIRMAYDI, ular
 * hamon so'mda qoladi (CLAUDE.md UZS formatlash qoidasi).
 */
export function formatBcn(n: number): string {
  return `${n.toLocaleString('ru-RU').replace(/,/g, ' ')} BCN`
}
