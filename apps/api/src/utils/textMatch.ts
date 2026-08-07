/**
 * Qisqa kalit so'zlarni matn ichida so'z chegarasi bilan qidirish.
 *
 * MUHIM: JS regex'dagi standart `\b` faqat lotin harflari/raqamlar/`_`ni
 * (`[A-Za-z0-9_]`) "so'z belgisi" deb hisoblaydi — kirill harflari `\W`
 * sifatida ko'riladi. Natijada `\bвуз\b` каби ibora kirillcha matn
 * ichida DEYARLI HECH QACHON mos kelmaydi (chunki bo'shliq ↔ kirill harf
 * o'tishi \w/\W chegarasi hisoblanmaydi). Shu sabab bu yerda lotin VA
 * kirill harflarini birga tan oladigan qo'lda chegara ishlatiladi.
 */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const LETTER_CLASS = 'a-zа-яёʼ\''

/**
 * Qisqa (≤4 belgili) atamalar so'z chegarasi bilan, uzunroqlari oddiy
 * substring bilan qidiriladi. Ikkala argument ham taqqoslashdan oldin
 * kichik harflarga o'tkaziladi.
 */
export function hasWordMatch(haystack: string, term: string): boolean {
  const h = haystack.toLowerCase()
  const t = term.toLowerCase()
  if (t.length <= 4) {
    const re = new RegExp(`(^|[^${LETTER_CLASS}0-9])${escapeRegex(t)}($|[^${LETTER_CLASS}0-9])`, 'i')
    return re.test(h)
  }
  return h.includes(t)
}
