/**
 * EduFit wizard va bosh sahifa hero'sida umumiy ishlatiladigan
 * maqsad (goal) tavsiyalari — ikki joyda duplikatsiya bo'lmasligi uchun
 * bitta manbadan olinadi.
 *
 * `label` — tugmada ko'rinadigan matn, `value` — bosilganda maqsad
 * maydoniga yoziladigan qidiruv matni. Ko'p hollarda ikkalasi bir xil,
 * lekin masalan "O'quv kurslari" — aniq bitta yo'nalishga emas, balki
 * OTMga tayyorlov VA til kurslari BIRLASHMASIGA ishora qiladi (backendda
 * GENERAL_COURSES → [UNIVERSITY_PREP, LANGUAGES] guruhi orqali). Bu
 * BARCHA yo'nalishlarni qamrab oluvchi umumiy tushuncha EMAS — IT,
 * Dizayn, Marketing kabi allaqachon alohida pilli bor yo'nalishlar
 * bunga kirmaydi (matchService.ts → evaluateGoal, educationCategories.ts
 * → CATEGORY_GROUPS).
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
    { label: "O'quv kurslari", value: "O'quv kurslari" },
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
