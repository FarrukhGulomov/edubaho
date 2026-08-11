/**
 * EduFit wizard va bosh sahifa hero'sida umumiy ishlatiladigan
 * maqsad (goal) tavsiyalari — ikki joyda duplikatsiya bo'lmasligi uchun
 * bitta manbadan olinadi.
 */
export const GOAL_SUGGESTIONS: Record<string, string[]> = {
  COURSE_CENTER: [
    'IELTS', 'SAT', 'TOEFL', 'Ingliz tili', 'Frontend', 'Dasturlash',
    'Dizayn', 'Marketing', 'Tadbirkorlik', 'Buxgalteriya', 'Matematika',
    'OTMga tayyorlov', 'Kasb almashtirish', 'Shaxsiy rivojlanish',
  ],
  SCHOOL:        ['Prezident maktabi', 'Xususiy maktab', 'Ingliz tili'],
  KINDERGARTEN:  ['Xususiy bog\'cha', 'Ingliz tili guruhi', 'Rivojlantiruvchi darslar'],
}
