/**
 * EduFit wizard va bosh sahifa hero'sida umumiy ishlatiladigan
 * maqsad (goal) tavsiyalari — ikki joyda duplikatsiya bo'lmasligi uchun
 * bitta manbadan olinadi.
 *
 * `label` — tugmada ko'rinadigan matn, `value` — bosilganda maqsad
 * maydoniga yoziladigan qidiruv matni. Ko'p hollarda ikkalasi bir xil,
 * lekin masalan "O'quv kurslari" — aniq bitta yo'nalishga emas, balki
 * KENG tushunchaga ishora qiladi (o'zida OTMga tayyorlov, fan kurslari,
 * til kurslari va h.k.ni qamrab oladi), shuning uchun `value: ''`
 * (bo'sh) — bosilganda hech qanday yo'nalish filtri qo'yilmaydi va
 * barcha faol o'quv markazlar ko'rsatiladi. Aks holda (aniq matn bilan
 * qidirilsa) qattiq filtr (matchService.ts) hech qanday kategoriyaga
 * mos kelmagan umumiy iborani "natija yo'q" deb rad etardi.
 */
export interface GoalSuggestion {
  label: string
  value: string
}

export const GOAL_SUGGESTIONS: Record<string, GoalSuggestion[]> = {
  COURSE_CENTER: [
    { label: 'IELTS', value: 'IELTS' },
    { label: 'SAT', value: 'SAT' },
    { label: 'Dasturlash', value: 'Dasturlash' },
    { label: 'Dizayn', value: 'Dizayn' },
    { label: 'Marketing', value: 'Marketing' },
    { label: 'Tadbirkorlik', value: 'Tadbirkorlik' },
    { label: 'Buxgalteriya', value: 'Buxgalteriya' },
    { label: "O'quv kurslari", value: '' },
    { label: 'Shaxsiy rivojlanish', value: 'Shaxsiy rivojlanish' },
  ],
  SCHOOL: [
    { label: 'Prezident maktabi', value: 'Prezident maktabi' },
    { label: 'Xususiy maktab', value: 'Xususiy maktab' },
    { label: 'Ingliz tili', value: 'Ingliz tili' },
  ],
  KINDERGARTEN: [
    { label: "Xususiy bog'cha", value: "Xususiy bog'cha" },
    { label: 'Ingliz tili guruhi', value: 'Ingliz tili guruhi' },
    { label: 'Rivojlantiruvchi darslar', value: 'Rivojlantiruvchi darslar' },
  ],
}
