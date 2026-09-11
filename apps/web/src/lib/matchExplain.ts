import type { MatchComponent } from './api'

/**
 * "Nega bu tavsiya?" breakdown'idagi har bir qatorni Mos keladi / Qisman
 * mos / Noma'lum / Mos kelmaydi sifatida belgilaydi — avval faqat
 * rangli progress-bar bo'lib, ma'lumot yo'qligi ("hasData: false") bilan
 * chindan mos kelmaslik vizual jihatdan ajratilmasdi (UX audit topilmasi:
 * "Never present unknown ... as if the user selected them").
 */
export function explanationLabel(component: Pick<MatchComponent, 'hasData' | 'score'>, lang: 'uz' | 'ru'): string {
  if (!component.hasData) return lang === 'ru' ? 'Неизвестно' : "Noma'lum"
  if (component.score >= 70) return lang === 'ru' ? 'Подходит' : 'Mos keladi'
  if (component.score >= 45) return lang === 'ru' ? 'Частично подходит' : 'Qisman mos'
  return lang === 'ru' ? 'Не подходит' : 'Mos kelmaydi'
}

/**
 * Natija kartasida ijobiy sabablar bilan bir qatorda BITTA halol
 * eslatma (trade-off) tanlaydi — masalan foydalanuvchi byudjet
 * kiritgan-u narx ma'lumoti yo'q bo'lsa, yoki biror mezon aniq past
 * bo'lsa. Hech narsa topilmasa — null (eslatma ko'rsatilmaydi).
 */
export function pickCaveat(components: MatchComponent[], budgetSet: boolean): MatchComponent | null {
  const budget = components.find((c) => c.key === 'budget')
  if (budgetSet && budget && !budget.hasData) return budget

  const weak = components
    .filter((c) => c.hasData && c.score < 50)
    .sort((a, b) => a.score - b.score)
  return weak[0] ?? null
}
