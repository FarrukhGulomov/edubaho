/**
 * Ta'lim profili (Education Profile) — muassasa aynan qaysi
 * yo'nalishlarni o'qitishini QATTIQ belgilaydigan tuzilgan toifalar.
 *
 * Muammo (real xato): foydalanuvchi "Buxoro" + "OTMga kirish" tanlaganda,
 * tizim faqat IT kurslarini o'qitadigan "IT Park Buxoro"ni 67% moslik
 * bilan tavsiya qildi — chunki eski algoritm erkin matnli tavsif/nomga
 * asoslangan yumshoq moslikka tayangan edi, real dastur ro'yxatiga emas.
 *
 * Yechim: har bir muassasa uchun aniq "Ha/Yo'q" toifalar ro'yxati
 * (InstitutionDetail.categories). Moslik algoritmida bu QATTIQ filtr —
 * foydalanuvchi maqsadi ma'lum toifaga to'g'ri kelsa-yu, muassasada
 * shu toifa bo'lmasa, u umuman tavsiya ro'yxatiga kirmaydi.
 */

import { hasWordMatch } from './textMatch'

export interface EducationCategoryDef {
  code: string
  labelUz: string
  labelRu: string
  /** Moslik sababi (explainability chiplari uchun): "✓ ..." */
  reasonUz: string
  reasonRu: string
  /**
   * Kalit so'zlar — ikki yo'nalishda ishlatiladi:
   * 1) Foydalanuvchi maqsad matnini toifaga bog'lash (classifyGoalCategory)
   * 2) Muassasa dastur/mutaxassislik matnidan toifani avtomatik aniqlash
   *    (inferCategories — admin keyin qo'lda tahrirlashi mumkin)
   */
  keywords: string[]
  /**
   * Juft so'zlar — IKKALASI HAM matnda uchrasagina toifa deb hisoblanadi.
   * O'zbek tili qo'shimchali (agglutinativ) bo'lgani uchun ("universitet"
   * → "universitetga"/"universitetlarga"/"universitetiga") aniq bir butun
   * ibora ro'yxati barcha shakllarni tutolmaydi — masalan "Xorijiy
   * universitetlarga tayyorlov" iborasi "universitetga tayyorlov" bilan
   * so'zma-so'z mos kelmaydi. Juft tekshiruv ikkala ildizni (masalan
   * "universitet" + "tayyor") alohida qidiradi — qo'shimchalardan qat'i
   * nazar topiladi, lekin faqat ikkalasi birga kelganda (yolg'iz
   * "universitet" so'zi haqida gap ketishi kabi soxta hitlardan saqlaydi).
   */
  keywordPairs?: [string, string][]
}

export const EDUCATION_CATEGORIES: EducationCategoryDef[] = [
  {
    code: 'UNIVERSITY_PREP',
    labelUz: 'OTMga kirish tayyorlov',
    labelRu: 'Подготовка к поступлению в вуз',
    reasonUz: "OTMga kirish tayyorlov mavjud",
    reasonRu: 'Есть подготовка к поступлению в вуз',
    keywords: [
      'otmga kirish', 'universitetga tayyorlov', 'universitetga kirish',
      'подготовка к поступлению', 'поступление в университет', 'поступление в вуз',
      'university admission', 'college admission', 'abituriyent', 'абитуриент',
      'dtm tayyorlov', 'дтм', 'oliy ta\'lim muassasasiga',
    ],
    keywordPairs: [
      ['universitet', 'tayyor'], ['universitet', 'kirish'], ['universitet', 'qabul'],
      ["oliy ta'lim", 'tayyor'], ['вуз', 'поступлен'], ['университет', 'поступлен'],
    ],
  },
  {
    code: 'IELTS',
    labelUz: 'IELTS',
    labelRu: 'IELTS',
    reasonUz: 'IELTS kursi mavjud',
    reasonRu: 'Есть курс IELTS',
    keywords: ['ielts'],
  },
  {
    code: 'SAT',
    labelUz: 'SAT',
    labelRu: 'SAT',
    reasonUz: 'SAT kursi mavjud',
    reasonRu: 'Есть курс SAT',
    keywords: ['sat'],
  },
  {
    code: 'CEFR',
    labelUz: 'CEFR / TOEFL',
    labelRu: 'CEFR / TOEFL',
    reasonUz: 'CEFR/TOEFL kursi mavjud',
    reasonRu: 'Есть курс CEFR/TOEFL',
    keywords: ['cefr', 'toefl'],
  },
  {
    code: 'SCHOOL_SUBJECTS',
    labelUz: 'Maktab fanlari',
    labelRu: 'Школьные предметы',
    reasonUz: 'Maktab fanlari bo\'yicha darslar mavjud',
    reasonRu: 'Есть занятия по школьным предметам',
    keywords: [
      'maktab fani', 'maktab fanlari', 'school subject', 'школьный предмет',
      'matematika', 'fizika', 'kimyo', 'biologiya', 'tarix', 'geografiya',
      'adabiyot', 'ona tili', 'geometriya', 'algebra',
    ],
  },
  {
    code: 'IT_COURSES',
    labelUz: 'IT kurslari',
    labelRu: 'IT-курсы',
    reasonUz: 'IT kurslari mavjud',
    reasonRu: 'Есть IT-курсы',
    keywords: [
      'it kurs', 'it курс', 'it ta\'lim', 'информатика курс', 'kompyuter kurs',
      'raqamli texnologiya',
    ],
  },
  {
    code: 'PROGRAMMING',
    labelUz: 'Dasturlash',
    labelRu: 'Программирование',
    reasonUz: 'Dasturlash kurslari mavjud',
    reasonRu: 'Есть курсы программирования',
    keywords: [
      'dasturlash', 'programming', 'coding', 'kodlash', 'программирование',
      'frontend', 'backend', 'fullstack', 'full-stack', 'dasturchi',
    ],
  },
  {
    code: 'DESIGN',
    labelUz: 'Dizayn',
    labelRu: 'Дизайн',
    reasonUz: 'Dizayn kurslari mavjud',
    reasonRu: 'Есть курсы дизайна',
    keywords: ['dizayn', 'дизайн', 'design', 'grafik dizayn', 'web dizayn', 'uiux', 'ui/ux', 'ui-ux'],
  },
  {
    code: 'MARKETING',
    labelUz: 'Marketing',
    labelRu: 'Маркетинг',
    reasonUz: 'Marketing kurslari mavjud',
    reasonRu: 'Есть курсы маркетинга',
    keywords: ['marketing', 'маркетинг', 'smm'],
  },
  {
    code: 'ACCOUNTING',
    labelUz: 'Buxgalteriya',
    labelRu: 'Бухгалтерия',
    reasonUz: 'Buxgalteriya kurslari mavjud',
    reasonRu: 'Есть курсы бухгалтерии',
    keywords: ['buxgalteriya', 'бухгалтерия', 'accounting', '1c', '1с'],
  },
  {
    code: 'LANGUAGES',
    labelUz: 'Chet tillari',
    labelRu: 'Иностранные языки',
    reasonUz: 'Chet tili kurslari mavjud',
    reasonRu: 'Есть курсы иностранных языков',
    keywords: [
      'chet tili', 'xorij tili', 'til kursi', 'foreign language', 'иностранный язык',
      'ingliz tili', 'english', 'rus tili', 'russian', 'nemis tili', 'german',
      'fransuz tili', 'french', 'xitoy tili', 'chinese', 'koreys tili', 'korean',
      'arab tili', 'arabic',
    ],
  },
  {
    code: 'KIDS_EDUCATION',
    labelUz: "Bolalar ta'limi",
    labelRu: 'Обучение детей',
    reasonUz: "Bolalar uchun dasturlar mavjud",
    reasonRu: 'Есть программы для детей',
    keywords: [
      "bolalar ta'lim", 'bolalar uchun', 'maktabgacha', "bog'cha",
      'kids', 'children education', 'дошкольное', 'детское образование',
    ],
  },
  {
    code: 'PROFESSIONAL_CERTIFICATION',
    labelUz: 'Kasbiy sertifikatlash',
    labelRu: 'Профессиональная сертификация',
    reasonUz: 'Kasbiy sertifikatlash dasturi mavjud',
    reasonRu: 'Есть программа профсертификации',
    keywords: [
      'sertifikat', 'kasbiy sertifikat', 'sertifikatlash', 'сертификат',
      'сертификация', 'professional certification', 'certification',
    ],
  },
  {
    code: 'CAREER_CHANGE',
    labelUz: 'Kasb almashtirish',
    labelRu: 'Смена профессии',
    reasonUz: "Kasb almashtirish dasturi mavjud",
    reasonRu: 'Есть программа смены профессии',
    keywords: [
      'kasb almashtirish', "kasb o'zgartirish", 'смена профессии',
      'qayta tayyorlov', 'переквалификация', 'career change', 'retraining',
    ],
  },
  {
    // Faqat "Menga mosini top" wizard'idagi "O'quv kurslari" pilli
    // uchun — foydalanuvchi bilan ANIQLASHTIRILGAN: bu keng, lekin
    // CHEKSIZ tushuncha EMAS. O'z ichiga OTMga tayyorlov va til
    // kurslarini oladi, lekin IT/Dizayn/Marketing kabi allaqachon
    // alohida pilli bor yo'nalishlarni QAMRAB OLMAYDI. Shuning uchun
    // muassasalarga bu kod hech qachon to'g'ridan-to'g'ri
    // tayinlanmaydi — faqat GOAL matnini CATEGORY_GROUPS orqali
    // UNIVERSITY_PREP+LANGUAGES birlashmasiga "tarjima qilish" uchun.
    code: 'GENERAL_COURSES',
    labelUz: "O'quv kurslari",
    labelRu: 'Учебные курсы',
    reasonUz: "O'quv kurslari mavjud",
    reasonRu: 'Есть учебные курсы',
    keywords: ["o'quv kurslari", 'учебные курсы', 'study courses'],
  },
]

const CATEGORY_BY_CODE = new Map(EDUCATION_CATEGORIES.map((d) => [d.code, d]))

export function getCategoryDef(code: string): EducationCategoryDef | undefined {
  return CATEGORY_BY_CODE.get(code)
}

/**
 * Ba'zi GOAL qiymatlari bitta aniq toifaga emas, balki bir nechta
 * toifaning BIRLASHMASIGA ishora qiladi (masalan GENERAL_COURSES —
 * "O'quv kurslari" — OTMga tayyorlov VA til kurslarini o'z ichiga
 * oladi). Bu FAQAT goal matnini muassasa toifalariga bog'lashda
 * ishlatiladi (evaluateGoal) — muassasalarning o'ziga bu "guruh" kodi
 * hech qachon tayinlanmaydi, faqat haqiqiy a'zo kodlar (masalan
 * UNIVERSITY_PREP) tayinlanadi.
 */
export const CATEGORY_GROUPS: Record<string, string[]> = {
  GENERAL_COURSES: ['UNIVERSITY_PREP', 'LANGUAGES'],
}

/** Guruh kodini a'zo kodlarga yoyadi; oddiy kod bo'lsa o'zini qaytaradi */
export function expandCategoryGroup(code: string): string[] {
  return CATEGORY_GROUPS[code] ?? [code]
}

function defMatches(text: string, def: EducationCategoryDef): boolean {
  if (def.keywords.some((kw) => hasWordMatch(text, kw))) return true
  if (def.keywordPairs?.some(([a, b]) => hasWordMatch(text, a) && hasWordMatch(text, b))) return true
  return false
}

/**
 * Foydalanuvchi maqsad matnini (masalan "OTMga kirish", "IELTS")
 * ma'lum toifaga bog'laydi. Butun so'rov matni tekshiriladi (tokenlarga
 * bo'lib emas) — "University Admission" kabi ko'p so'zli iboralar
 * so'z-so'z bo'linganda yo'qolib qolmasligi uchun.
 */
export function classifyGoalCategory(goal: string): string | null {
  const g = goal.toLowerCase().trim()
  if (!g) return null
  for (const def of EDUCATION_CATEGORIES) {
    if (defMatches(g, def)) return def.code
  }
  return null
}

/**
 * Muassasaning mavjud dastur/mutaxassislik matnidan qaysi toifalarga
 * mos kelishini avtomatik aniqlaydi. Seed/backfill uchun — admin
 * keyinchalik "Ta'lim profili" bo'limida qo'lda tahrirlashi mumkin.
 */
export function inferCategories(input: {
  type: string
  programs?: string[]
  specializations?: string[]
  descriptionUz?: string | null
}): string[] {
  const haystack = [
    ...(input.programs ?? []),
    ...(input.specializations ?? []),
    input.descriptionUz ?? '',
  ].join(' ').toLowerCase()

  const found = new Set<string>()
  for (const def of EDUCATION_CATEGORIES) {
    if (defMatches(haystack, def)) found.add(def.code)
  }

  // Dasturlash aniqlansa — IT kurslari toifasi ham mantiqan to'g'ri keladi
  if (found.has('PROGRAMMING')) found.add('IT_COURSES')

  // Muassasa turi — qo'shimcha ishonchli signal
  if (input.type === 'KINDERGARTEN') found.add('KIDS_EDUCATION')
  if (input.type === 'LANGUAGE_CENTER') found.add('LANGUAGES')
  if (input.type === 'IT_SCHOOL') found.add('IT_COURSES')
  if (input.type === 'SCHOOL' || input.type === 'LYCEUM') found.add('SCHOOL_SUBJECTS')

  return [...found]
}
