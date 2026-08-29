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
  /**
   * Tugmada ko'rinadigan matn — ikki tilda. Rasmiy kurs/texnologiya
   * nomlari (IELTS, SAT, Frontend…) tarjima QILINMAYDI: ular xalqaro
   * atamalar va rus tilida ham xuddi shunday yoziladi.
   */
  label: { uz: string; ru: string }
  /**
   * Bosilganda maqsad maydoniga yoziladigan QIDIRUV matni — har doim
   * o'zbekcha qoladi, chunki backend (subjectSynonyms.ts, educationCategories.ts)
   * aynan shu qiymatlar bo'yicha moslikni hisoblaydi. Tarjima qilinsa
   * qidiruv natijalari o'zgarib ketardi.
   */
  value: string
}

export const GOAL_SUGGESTIONS: Record<string, GoalSuggestion[]> = {
  COURSE_CENTER: [
    { label: { uz: 'IELTS',               ru: 'IELTS' },                  value: 'IELTS' },
    { label: { uz: 'SAT',                 ru: 'SAT' },                    value: 'SAT' },
    { label: { uz: 'Dasturlash',          ru: 'Программирование' },       value: 'Dasturlash' },
    { label: { uz: 'Dizayn',              ru: 'Дизайн' },                 value: 'Dizayn' },
    { label: { uz: 'Marketing',           ru: 'Маркетинг' },              value: 'Marketing' },
    { label: { uz: 'Tadbirkorlik',        ru: 'Предпринимательство' },    value: 'Tadbirkorlik' },
    { label: { uz: 'Buxgalteriya',        ru: 'Бухгалтерский учёт' },     value: 'Buxgalteriya' },
    { label: { uz: "O'quv kurslari",      ru: 'Образовательные курсы' },  value: "O'quv kurslari" },
    { label: { uz: 'Shaxsiy rivojlanish', ru: 'Личностное развитие' },    value: 'Shaxsiy rivojlanish' },
  ],
  SCHOOL: [
    { label: { uz: 'Prezident maktabi', ru: 'Президентская школа' }, value: 'Prezident maktabi' },
    { label: { uz: 'Xususiy maktab',    ru: 'Частная школа' },       value: 'Xususiy maktab' },
    { label: { uz: 'Ingliz tili',       ru: 'Английский язык' },     value: 'Ingliz tili' },
  ],
  KINDERGARTEN: [
    { label: { uz: "Xususiy bog'cha",          ru: 'Частный детский сад' },      value: "Xususiy bog'cha" },
    { label: { uz: 'Ingliz tili guruhi',       ru: 'Группа английского языка' }, value: 'Ingliz tili guruhi' },
    { label: { uz: 'Rivojlantiruvchi darslar', ru: 'Развивающие занятия' },      value: 'Rivojlantiruvchi darslar' },
  ],
}
