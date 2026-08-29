/**
 * Rus tilida son bilan kelgan otning to'g'ri shakli.
 *
 * Rus tilida uchta shakl bor va ular sonning OXIRGI raqamlariga bog'liq:
 *   1, 21, 31, 101…      → "1 учреждение"     (one)
 *   2–4, 22–24…          → "2 учреждения"     (few)
 *   0, 5–20, 25–30…      → "5 учреждений"     (many)
 *
 * 11–14 alohida istisno: ular "one/few" ga o'xshab tugasa ham "many"
 * shaklini oladi ("11 учреждений", "12 учреждений").
 *
 * O'zbek tilida bunday o'zgarish yo'q (son qanday bo'lishidan qat'i nazar
 * ot bir xil qoladi), shuning uchun bu funksiya faqat ruscha matnlar
 * uchun kerak.
 */
export function pluralRu(n: number, forms: [one: string, few: string, many: string]): string {
  const abs = Math.abs(n) % 100
  const last = abs % 10

  if (abs > 10 && abs < 20) return forms[2]  // 11–19 → many
  if (last > 1 && last < 5)  return forms[1]  // 2–4   → few
  if (last === 1)            return forms[0]  // 1     → one
  return forms[2]                             // 0, 5–9 → many
}

/** "31 учреждение" / "2 учреждения" / "5 учреждений" */
export function institutionsRu(n: number): string {
  return `${n} ${pluralRu(n, ['учреждение', 'учреждения', 'учреждений'])}`
}

/** "1 отзыв" / "3 отзыва" / "5 отзывов" */
export function reviewsRu(n: number): string {
  return `${n} ${pluralRu(n, ['отзыв', 'отзыва', 'отзывов'])}`
}
