/**
 * EduFit — Moslik ballini hisoblash xizmati (v1, deterministik va tushuntiriladigan)
 *
 * Falsafa: "Qaysi markaz yaxshi?" emas, "Shu foydalanuvchiga qaysi biri mos?"
 *
 * v1 ataylab ML'siz qurilgan:
 *  - Har bir komponent 0-100 oralig'ida, sabab (reason) bilan birga qaytadi
 *  - Og'irliklar shaffof — foydalanuvchi NEGA bu tavsiya chiqqanini ko'radi
 *  - Ma'lumot yetishmasa ball "jarima" emas, neytral qiymat oladi va
 *    ishonchlilik (confidence) darajasi pasayadi
 *
 * Kelajak bosqichlari docs/ALGORITM.md da: natija-tracking (Stage 2),
 * o'xshash o'quvchilar collaborative filtering (Stage 3).
 */

import { expandSearchTerms } from '../utils/subjectSynonyms'
import { classifyGoalCategory, expandCategoryGroup, getCategoryDef } from '../utils/educationCategories'
import { hasWordMatch } from '../utils/textMatch'

// ─── Kirish ma'lumotlari ──────────────────────────────────────

export interface MatchPreferences {
  /** Muassasa turi (majburiy) */
  type: string
  /** Maqsad erkin matnda: "IELTS", "Frontend", "matematika"... */
  goal?: string
  cityId?: string
  regionId?: string
  /** Oylik byudjet (UZS) */
  budget?: number
  /** Qulay vaqt: morning | afternoon | evening | weekend */
  shift?: string
  /** O'quvchi yoshi */
  age?: number
  /** Ta'lim tili: uz | ru | en */
  language?: string
  /** O'qish formati: offline | online | hybrid */
  format?: string
  /** Faqat Premium (tekshirilgan, kengaytirilgan profilli) markazlarni afzal ko'rish */
  preferPremium?: boolean
  /**
   * Route darajasida so'rov boshida BIR MARTA hisoblangan `goal` toifasi
   * (kalit-so'z va zarur bo'lsa AI fallback orqali) — har bir nomzod uchun
   * qayta klassifikatsiya qilinmasligi uchun shu yerga "keshlanadi".
   * `undefined` — hali hisoblanmagan (evaluateGoal o'zi sinxron
   * classifyGoalCategory bilan aniqlaydi). `null` — hisoblangan, lekin
   * toifa topilmagan.
   */
  resolvedGoalCategory?: string | null
}

/** Baholanadigan muassasa (Prisma'dan keladigan minimal shakl) */
export interface MatchCandidate {
  id: string
  nameUz: string
  nameRu: string | null
  slug: string
  type: string
  status: string
  isVerified: boolean
  avgRating: number | null
  reviewCount: number
  cityId: string | null
  regionId: string | null
  phone: string | null
  deliveryMode: string
  details: {
    descriptionUz: string | null
    minAge: number | null
    maxAge: number | null
    languages: string[]
    programs: string[]
    shifts: string[]
    specializations: string[]
    /** Ta'lim profili: muassasa qattiq belgilagan yo'nalishlar (EducationCategoryCode[]) */
    categories: string[]
  } | null
  pricing: {
    monthlyMin: number | null
    monthlyMax: number | null
    hasDiscount?: boolean
  } | null
  mediaCount?: number
}

// ─── Natija ───────────────────────────────────────────────────

export interface ScoreComponent {
  key: string
  labelUz: string
  labelRu: string
  /** 0-100 */
  score: number
  weight: number
  /** Ball hisoblashda real ma'lumot bormidi? (confidence uchun) */
  hasData: boolean
  reasonUz: string
  reasonRu: string
}

export interface MatchResult {
  /** Yakuniy moslik: 0-100 */
  score: number
  /** Ma'lumot to'liqligiga asoslangan ishonchlilik: 0-100 */
  confidence: number
  components: ScoreComponent[]
  /** Eng kuchli 3 ta sabab (UI chiplari uchun) */
  topReasonsUz: string[]
  topReasonsRu: string[]
}

// ─── Og'irliklar (yig'indisi 1.0) ─────────────────────────────
//
// v1'dan v2'ga: format (onlayn/offlayn/gibrid) va til komponentlari
// qo'shildi (til maydoni v1'da mavjud edi, lekin ballashda ishlatilmasdi).
//
// v2'dan v3'ga: real xato — "OTMga kirish" + "Buxoro" so'ralganda faqat
// IT kurslarini o'qitadigan markaz 67% moslik bilan chiqib ketdi, chunki
// maqsad (goal) og'irligi joylashuv/sifat bilan deyarli teng edi. Endi
// TA'LIM YO'NALISHI (goal) QATTIQ FILTR + ustuvor omil: og'irligi
// joylashuv/sifat/byudjetdan sezilarli yuqori qilib ko'tarildi.
// Boshqa komponentlarning hech biri olib tashlanmadi — faqat
// proporsional pasaytirildi.
const WEIGHTS = {
  goal:     0.38,
  quality:  0.14,
  budget:   0.10,
  location: 0.09,
  schedule: 0.08,
  format:   0.07,
  language: 0.06,
  age:      0.04,
  trust:    0.04,
} as const

// Bayesian silliqlash: kam sharhli 5.0 reyting ko'p sharhli 4.5 dan yuqori chiqmasin
const BAYES_PRIOR_COUNT = 10

/**
 * Minimal tavsiya balli (0-100). Shundan past ball olgan muassasalar
 * "moslik" sifatida umuman ko'rsatilmaydi — 45%, 52% kabi zaif
 * "to'ldiruvchi" natijalar ro'yxatni to'ldirish uchun chiqarilmaydi.
 * Kelajakda muassasa turi/segment bo'yicha sozlanishi mumkin (shu sabab
 * alohida konstanta sifatida eksport qilingan).
 */
export const DEFAULT_MIN_MATCH_SCORE = 75

/**
 * Bitta muassasa uchun moslik ballini hisoblash.
 * @param globalAvgRating — platformadagi o'rtacha reyting (Bayesian prior)
 */
export function computeMatchScore(
  inst: MatchCandidate,
  prefs: MatchPreferences,
  globalAvgRating: number,
): MatchResult {
  const components: ScoreComponent[] = [
    scoreGoal(inst, prefs),
    scoreQuality(inst, globalAvgRating),
    scoreBudget(inst, prefs),
    scoreLocation(inst, prefs),
    scoreSchedule(inst, prefs),
    scoreFormat(inst, prefs),
    scoreLanguage(inst, prefs),
    scoreAge(inst, prefs),
    scoreTrust(inst, prefs),
  ]

  const total = components.reduce((sum, c) => sum + c.score * c.weight, 0)

  // Ishonchlilik: real ma'lumotga ega komponentlarning og'irlik ulushi
  const confidence = Math.round(
    components.reduce((sum, c) => sum + (c.hasData ? c.weight : 0), 0) * 100,
  )

  // Eng yuqori hissali (ball × og'irlik) komponentlardan sabablar
  const sorted = [...components]
    .filter((c) => c.hasData && c.score >= 70)
    .sort((a, b) => b.score * b.weight - a.score * a.weight)
    .slice(0, 3)

  return {
    score: Math.round(total),
    confidence,
    components,
    topReasonsUz: sorted.map((c) => c.reasonUz),
    topReasonsRu: sorted.map((c) => c.reasonRu),
  }
}

// ─── 1. Maqsad mosligi (QATTIQ FILTR + ustuvor ballash) ───────

export interface GoalEvaluation {
  /** false bo'lsa — muassasa qattiq filtrda chetlab o'tiladi (tavsiya ro'yxatiga kirmaydi) */
  matched: boolean
  matchType: 'none' | 'category' | 'course'
  /** matchType === 'category' bo'lsa — aniqlangan toifa kodi */
  category?: string
  /** matchType === 'course' bo'lsa — dastur/mutaxassislik matnidagi mos kelish darajasi (0-1) */
  ratio: number
  /**
   * matchType === 'course' bo'lsa — aynan qaysi dastur/mutaxassislik
   * yozuvi mos kelgani (masalan "IELTS Advanced"). Foydalanuvchiga
   * "nega bu tavsiya" tushuntirishida aniq dastur nomini ko'rsatish uchun
   * (generic "IELTS yo'nalishi mavjud" o'rniga).
   */
  matchedProgram?: string
}

/**
 * Muassasaning haqiqatda o'qitadigan dasturlariga (STRUKTURALANGAN
 * maydonlar — programs/specializations) qarab maqsadni tekshiradi.
 *
 * Ataylab faqat strukturalangan maydonlar ishlatiladi — erkin matnli
 * tavsif (descriptionUz) yoki nomga (nameUz) qo'shilmaydi, chunki aynan
 * shu orqali soxta mosliklar yuzaga kelgan edi (masalan tavsifda
 * marketing maqsadida tilga olingan umumiy so'zlar noto'g'ri hit bergan).
 */
function computeCourseMatch(inst: MatchCandidate, goal: string): { ratio: number; matchedProgram?: string } {
  const goalTokens = tokenize(goal)
  const entries = [
    ...(inst.details?.programs ?? []),
    ...(inst.details?.specializations ?? []),
  ]
  const haystack = entries.join(' ').toLowerCase()

  if (goalTokens.length === 0) return { ratio: 0 }

  // Har bir token sinonimlari bilan kengaytiriladi:
  // "химия" → ["kimyo", "chemistry", ...] — qaysi tilda yozilishidan qat'i nazar topiladi
  const hits = goalTokens.filter((tok) =>
    expandSearchTerms(tok).some((variant) => hasWordMatch(haystack, variant)),
  )
  if (hits.length === 0) return { ratio: 0 }

  // Foydalanuvchiga aynan qaysi dastur/mutaxassislik mos kelganini
  // ko'rsatish uchun — birinchi mos kelgan yozuvni topamiz (generic
  // "IELTS yo'nalishi mavjud" o'rniga "IELTS Advanced" deb aytish mumkin)
  const matchedProgram = entries.find((entry) => {
    const entryLower = entry.toLowerCase()
    return hits.some((tok) => expandSearchTerms(tok).some((variant) => hasWordMatch(entryLower, variant)))
  })

  return { ratio: hits.length / goalTokens.length, matchedProgram }
}

/**
 * Maqsad mosligini QATTIQ tekshiradi — filtrlash (match.ts) va ballash
 * (scoreGoal) ikkalasida ham shu funksiya ishlatiladi (bitta manba).
 *
 * Tartib:
 * 1) Avval aniq dastur nomi bo'yicha qidiramiz (masalan "Java") —
 *    strukturalangan programs/specializations maydonida topilsa, bu
 *    eng ishonchli signal.
 * 2) Agar dastur darajasida hech narsa topilmasa — maqsad matni ma'lum
 *    ta'lim toifasiga (masalan "OTMga kirish", "IELTS") mos kelsa,
 *    muassasada aynan shu toifa Ta'lim profilida belgilanganmi tekshiramiz.
 * 3) Ikkalasi ham topilmasa — mos kelmaydi (qattiq chetlab o'tiladi,
 *    faqat yaqin joyda joylashgani yoki reytingi yaxshi bo'lgani uchun
 *    ko'rsatilmaydi).
 *
 * @param resolvedCategory — route darajasida so'rov boshida BIR MARTA
 * (kalit-so'z, zarur bo'lsa AI fallback bilan) hisoblangan toifa.
 * `undefined` uzatilsa — bu yerning o'zida sinxron `classifyGoalCategory`
 * bilan aniqlanadi (AI ishlatilmaydi, orqaga moslik uchun). `null` —
 * allaqachon hisoblangan, lekin hech qanday toifa topilmagan degani.
 *
 * Toifa "guruh" (masalan GENERAL_COURSES) bo'lishi mumkin —
 * `expandCategoryGroup` orqali a'zo kodlarga yoyiladi va muassasada
 * ULARDAN BIRI bo'lsa yetarli (masalan "O'quv kurslari" — OTMga
 * tayyorlov YOKI til kurslaridan biri bo'lsa mos hisoblanadi).
 */
export function evaluateGoal(
  inst: MatchCandidate,
  goal: string,
  resolvedCategory?: string | null,
): GoalEvaluation {
  const trimmed = goal.trim()
  if (!trimmed) return { matched: true, matchType: 'none', ratio: 0 }

  const { ratio, matchedProgram } = computeCourseMatch(inst, trimmed)
  if (ratio > 0) {
    return { matched: true, matchType: 'course', ratio, matchedProgram }
  }

  const category = resolvedCategory !== undefined ? resolvedCategory : classifyGoalCategory(trimmed)
  if (category) {
    const categories = inst.details?.categories ?? []
    const memberCodes = expandCategoryGroup(category)
    return { matched: memberCodes.some((c) => categories.includes(c)), matchType: 'category', category, ratio: 0 }
  }

  return { matched: false, matchType: 'none', ratio: 0 }
}

function scoreGoal(inst: MatchCandidate, prefs: MatchPreferences): ScoreComponent {
  const base = { key: 'goal', labelUz: 'Ta\'lim yo\'nalishi mosligi', labelRu: 'Соответствие направлению обучения', weight: WEIGHTS.goal }

  if (!prefs.goal?.trim()) {
    // Maqsad kiritilmagan — tur mosligi allaqachon filtrlangan, neytral yuqori
    return {
      ...base, score: 70, hasData: false,
      reasonUz: "Yo'nalish bo'yicha mos", reasonRu: 'Подходит по направлению',
    }
  }

  const ev = evaluateGoal(inst, prefs.goal, prefs.resolvedGoalCategory)

  // Nazariy jihatdan bu yerga yetib kelmasligi kerak — match.ts allaqachon
  // mos kelmagan nomzodlarni qattiq filtrlab tashlaydi. Xavfsizlik uchun
  // (scoreGoal boshqa joyda alohida chaqirilib qolsa) past ball qaytaramiz.
  if (!ev.matched) {
    return {
      ...base, score: 0, hasData: true,
      reasonUz: `"${prefs.goal}" yo'nalishi topilmadi`,
      reasonRu: `Направление "${prefs.goal}" не найдено`,
    }
  }

  if (ev.matchType === 'category' && ev.category) {
    const def = getCategoryDef(ev.category)
    return {
      ...base, score: 90, hasData: true,
      reasonUz: def?.reasonUz ?? "Yo'nalish mos keladi",
      reasonRu: def?.reasonRu ?? 'Направление подходит',
    }
  }

  if (ev.ratio >= 0.99) {
    // Aniq dastur nomi topilgan bo'lsa — o'sha nomni ko'rsatamiz
    // (foydalanuvchi so'zini qaytarishdan ko'ra ancha ishonchli va aniq)
    return ev.matchedProgram ? {
      ...base, score: 100, hasData: true,
      reasonUz: `"${ev.matchedProgram}" dasturi mavjud`,
      reasonRu: `Есть программа "${ev.matchedProgram}"`,
    } : {
      ...base, score: 100, hasData: true,
      reasonUz: `"${prefs.goal}" yo'nalishi aniq mavjud`,
      reasonRu: `Есть точное направление "${prefs.goal}"`,
    }
  }
  // Qisman mos (masalan bir nechta so'zdan faqat biri topildi)
  return {
    ...base, score: 60 + Math.round(ev.ratio * 30), hasData: true,
    reasonUz: ev.matchedProgram ? `"${ev.matchedProgram}" dasturiga yaqin` : `"${prefs.goal}" ga yaqin dasturlar bor`,
    reasonRu: ev.matchedProgram ? `Близко к программе "${ev.matchedProgram}"` : `Есть близкие к "${prefs.goal}" программы`,
  }
}

// ─── 2. Sifat (Bayesian reyting) ─────────────────────────────

function scoreQuality(inst: MatchCandidate, globalAvg: number): ScoreComponent {
  const base = { key: 'quality', labelUz: 'Sharh sifati', labelRu: 'Качество отзывов', weight: WEIGHTS.quality }

  const n = inst.reviewCount
  const r = inst.avgRating

  if (!r || n === 0) {
    return {
      ...base, score: 55, hasData: false,
      reasonUz: 'Hali sharhlar kam', reasonRu: 'Пока мало отзывов',
    }
  }

  // Bayesian: (C·m + R·n) / (C + n) — kam sharhda global o'rtachaga tortiladi
  const adjusted = (BAYES_PRIOR_COUNT * globalAvg + r * n) / (BAYES_PRIOR_COUNT + n)
  const score = Math.round(((adjusted - 1) / 4) * 100)

  return {
    ...base, score, hasData: n >= 3,
    reasonUz: `${r.toFixed(1)} ★ (${n} ta sharh)`,
    reasonRu: `${r.toFixed(1)} ★ (${n} отзывов)`,
  }
}

// ─── 3. Byudjet mosligi ───────────────────────────────────────

function scoreBudget(inst: MatchCandidate, prefs: MatchPreferences): ScoreComponent {
  const base = { key: 'budget', labelUz: 'Byudjetga moslik', labelRu: 'Соответствие бюджету', weight: WEIGHTS.budget }

  if (!prefs.budget) {
    return { ...base, score: 60, hasData: false, reasonUz: 'Byudjet kiritilmagan', reasonRu: 'Бюджет не указан' }
  }
  const min = inst.pricing?.monthlyMin
  if (!min) {
    return { ...base, score: 55, hasData: false, reasonUz: "Narx ma'lumoti yo'q", reasonRu: 'Нет данных о цене' }
  }

  if (min <= prefs.budget) {
    // Byudjet ichida — to'liq ball
    return {
      ...base, score: 100, hasData: true,
      reasonUz: 'Byudjetingizga sig\'adi', reasonRu: 'Вписывается в бюджет',
    }
  }

  // Byudjetdan oshsa: har +10% uchun -20 ball (50% oshsa 0).
  // Chegirma/aksiya mavjud bo'lsa (InstitutionPricing.hasDiscount) —
  // real narx pastroq bo'lishi mumkinligi uchun jarima yumshatiladi
  const over = min / prefs.budget - 1
  const rawScore = Math.max(0, Math.round(100 - over * 200))
  if (inst.pricing?.hasDiscount) {
    const score = Math.min(100, rawScore + 15)
    return {
      ...base, score, hasData: true,
      reasonUz: 'Chegirma mavjud — byudjetga yaqinlashishi mumkin',
      reasonRu: 'Есть скидка — может уложиться в бюджет',
    }
  }
  return {
    ...base, score: rawScore, hasData: true,
    reasonUz: over <= 0.2 ? 'Byudjetdan biroz qimmat' : 'Byudjetdan ancha qimmat',
    reasonRu: over <= 0.2 ? 'Немного дороже бюджета' : 'Значительно дороже бюджета',
  }
}

// ─── 4. Joylashuv ─────────────────────────────────────────────

function scoreLocation(inst: MatchCandidate, prefs: MatchPreferences): ScoreComponent {
  const base = { key: 'location', labelUz: 'Joylashuv', labelRu: 'Расположение', weight: WEIGHTS.location }

  // Onlayn markaz — istalgan shahardan qatnashish mumkin, shuning uchun
  // shahar mos kelmasligi uni PASAYTIRMASLIGI kerak (boshqa hududdagi
  // sifatli onlayn markaz jazolanmasligi shart)
  if (inst.deliveryMode === 'ONLINE') {
    return {
      ...base, score: 95, hasData: true,
      reasonUz: "Onlayn — istalgan shahardan qatnashish mumkin",
      reasonRu: 'Онлайн — можно из любого города',
    }
  }

  if (!prefs.cityId && !prefs.regionId) {
    return { ...base, score: 60, hasData: false, reasonUz: 'Shahar tanlanmagan', reasonRu: 'Город не выбран' }
  }
  if (prefs.cityId && inst.cityId === prefs.cityId) {
    return { ...base, score: 100, hasData: true, reasonUz: 'Shahringizda joylashgan', reasonRu: 'Находится в вашем городе' }
  }
  if (prefs.regionId && inst.regionId === prefs.regionId) {
    return { ...base, score: 70, hasData: true, reasonUz: 'Viloyatingizda joylashgan', reasonRu: 'Находится в вашей области' }
  }
  return { ...base, score: 25, hasData: true, reasonUz: 'Boshqa hududda', reasonRu: 'В другом регионе' }
}

// ─── 5. Dars vaqti ────────────────────────────────────────────

// Foydalanuvchi tanlovi → shifts matnidagi kalit so'zlar
const SHIFT_KEYWORDS: Record<string, string[]> = {
  morning:   ['ertalab', 'утрен', '08:', '09:', '10:'],
  afternoon: ['tush', 'дневн', '13:', '14:', '15:'],
  evening:   ['kech', 'вечер', '17:', '18:', '19:'],
  weekend:   ['hafta oxiri', 'shanba', 'yakshanba', 'выходн', 'суббот'],
}

function scoreSchedule(inst: MatchCandidate, prefs: MatchPreferences): ScoreComponent {
  const base = { key: 'schedule', labelUz: 'Dars vaqti', labelRu: 'Время занятий', weight: WEIGHTS.schedule }

  if (!prefs.shift) {
    return { ...base, score: 60, hasData: false, reasonUz: 'Vaqt tanlanmagan', reasonRu: 'Время не выбрано' }
  }
  const shifts = inst.details?.shifts ?? []
  if (shifts.length === 0) {
    return { ...base, score: 55, hasData: false, reasonUz: "Jadval ma'lumoti yo'q", reasonRu: 'Нет данных о расписании' }
  }

  const keywords = SHIFT_KEYWORDS[prefs.shift] ?? []
  const joined = shifts.join(' ').toLowerCase()
  const matched = keywords.some((k) => joined.includes(k))

  if (matched) {
    const label = { morning: 'Ertalabki', afternoon: 'Tushki', evening: 'Kechki', weekend: 'Hafta oxiri' }[prefs.shift] ?? ''
    const labelRu = { morning: 'Утренние', afternoon: 'Дневные', evening: 'Вечерние', weekend: 'Выходные' }[prefs.shift] ?? ''
    return {
      ...base, score: 100, hasData: true,
      reasonUz: `${label} guruhlar mavjud`, reasonRu: `Есть ${labelRu.toLowerCase()} группы`,
    }
  }
  return { ...base, score: 30, hasData: true, reasonUz: 'Siz tanlagan vaqtda guruh yo\'q', reasonRu: 'Нет групп в выбранное время' }
}

// ─── 6. O'qish formati (offlayn / onlayn / gibrid) ────────────

function scoreFormat(inst: MatchCandidate, prefs: MatchPreferences): ScoreComponent {
  const base = { key: 'format', labelUz: "O'qish formati", labelRu: 'Формат обучения', weight: WEIGHTS.format }

  if (!prefs.format) {
    return { ...base, score: 60, hasData: false, reasonUz: 'Format tanlanmagan', reasonRu: 'Формат не выбран' }
  }

  const mode = inst.deliveryMode // 'OFFLINE' | 'ONLINE' | 'HYBRID'

  if (mode === 'HYBRID') {
    // Gibrid markaz har qanday format afzalligiga mos keladi
    return { ...base, score: 100, hasData: true, reasonUz: 'Offlayn va onlayn ikkalasi ham mavjud', reasonRu: 'Доступны офлайн и онлайн' }
  }

  if (prefs.format === 'hybrid') {
    // Foydalanuvchi ikkalasiga ham moslashuvchan — sof offlayn/onlayn ham yetarli
    return { ...base, score: 75, hasData: true, reasonUz: "Moslashuvchan format bilan mos", reasonRu: 'Подходит по гибкому формату' }
  }

  const wantsOnline = prefs.format === 'online'
  const isOnline = mode === 'ONLINE'
  if (wantsOnline === isOnline) {
    return {
      ...base, score: 100, hasData: true,
      reasonUz: wantsOnline ? 'Onlayn formatda o\'qitiladi' : 'Offlayn (yuzma-yuz) darslar',
      reasonRu: wantsOnline ? 'Обучение в онлайн-формате' : 'Очные занятия',
    }
  }
  return {
    ...base, score: 25, hasData: true,
    reasonUz: wantsOnline ? 'Faqat offlayn xizmat ko\'rsatadi' : 'Faqat onlayn xizmat ko\'rsatadi',
    reasonRu: wantsOnline ? 'Работает только офлайн' : 'Работает только онлайн',
  }
}

// ─── 7. Til mosligi ────────────────────────────────────────────

function scoreLanguage(inst: MatchCandidate, prefs: MatchPreferences): ScoreComponent {
  const base = { key: 'language', labelUz: "O'qitish tili", labelRu: 'Язык обучения', weight: WEIGHTS.language }

  if (!prefs.language) {
    return { ...base, score: 60, hasData: false, reasonUz: 'Til tanlanmagan', reasonRu: 'Язык не выбран' }
  }
  const langs = inst.details?.languages ?? []
  if (langs.length === 0) {
    return { ...base, score: 55, hasData: false, reasonUz: "Til ma'lumoti yo'q", reasonRu: 'Нет данных о языке' }
  }
  if (langs.map((l) => l.toLowerCase()).includes(prefs.language.toLowerCase())) {
    const label = { uz: "O'zbek", ru: 'Rus', en: 'Ingliz' }[prefs.language] ?? prefs.language
    const labelRu = { uz: 'узбекском', ru: 'русском', en: 'английском' }[prefs.language] ?? prefs.language
    return {
      ...base, score: 100, hasData: true,
      reasonUz: `${label} tilida o'qitiladi`, reasonRu: `Обучение на ${labelRu} языке`,
    }
  }
  return { ...base, score: 30, hasData: true, reasonUz: 'Siz tanlagan tilda emas', reasonRu: 'Не на выбранном языке' }
}

// ─── 8. Yosh mosligi ─────────────────────────────────────────

function scoreAge(inst: MatchCandidate, prefs: MatchPreferences): ScoreComponent {
  const base = { key: 'age', labelUz: 'Yoshga moslik', labelRu: 'Соответствие возрасту', weight: WEIGHTS.age }

  if (!prefs.age) {
    return { ...base, score: 70, hasData: false, reasonUz: 'Yosh kiritilmagan', reasonRu: 'Возраст не указан' }
  }
  const min = inst.details?.minAge
  const max = inst.details?.maxAge
  if (min == null && max == null) {
    return { ...base, score: 70, hasData: false, reasonUz: "Yosh chegarasi ko'rsatilmagan", reasonRu: 'Возрастные рамки не указаны' }
  }

  const lo = min ?? 0
  const hi = max ?? 99
  if (prefs.age >= lo && prefs.age <= hi) {
    return { ...base, score: 100, hasData: true, reasonUz: 'Yoshingizga mos', reasonRu: 'Подходит по возрасту' }
  }
  // ±2 yosh chegarada — qisman mos
  if (prefs.age >= lo - 2 && prefs.age <= hi + 2) {
    return { ...base, score: 55, hasData: true, reasonUz: 'Yosh chegarasiga yaqin', reasonRu: 'Близко к возрастной границе' }
  }
  return { ...base, score: 15, hasData: true, reasonUz: 'Yosh chegarasidan tashqarida', reasonRu: 'Вне возрастных рамок' }
}

// ─── 9. Ishonch (profil to'liqligi + tasdiqlanganlik + Premium) ─

function scoreTrust(inst: MatchCandidate, prefs: MatchPreferences): ScoreComponent {
  const base = { key: 'trust', labelUz: 'Ishonchlilik', labelRu: 'Надёжность', weight: WEIGHTS.trust }

  let score = 20
  if (inst.isVerified) score += 40
  if (inst.phone) score += 10
  if (inst.details?.descriptionUz) score += 10
  if (inst.pricing?.monthlyMin) score += 10
  if ((inst.mediaCount ?? 0) > 0) score += 10

  // Foydalanuvchi Premium markazlarni afzal ko'rsa — qo'shimcha bonus
  const isPremium = inst.status === 'PREMIUM'
  if (prefs.preferPremium && isPremium) score += 15

  return {
    ...base,
    score: Math.min(100, score),
    hasData: true,
    reasonUz: prefs.preferPremium && isPremium
      ? 'Premium tasdiqlangan muassasa'
      : inst.isVerified ? 'Rasman tasdiqlangan muassasa' : "Profil ma'lumotlari mavjud",
    reasonRu: prefs.preferPremium && isPremium
      ? 'Premium подтверждённое учреждение'
      : inst.isVerified ? 'Официально подтверждено' : 'Профиль заполнен',
  }
}

// ─── Yordamchi ────────────────────────────────────────────────

/** Matnni qidiruv tokenlariga bo'lish (2+ belgili so'zlar) */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,;/]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2)
}
