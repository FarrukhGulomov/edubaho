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
// Mavjud komponentlarning hech biri olib tashlanmadi — faqat yangi
// ikkitasiga joy ochish uchun og'irliklar proporsional kamaytirildi,
// nisbiy tartib (goal/quality eng yuqori, trust/age eng past) saqlandi.
const WEIGHTS = {
  goal:     0.20,
  quality:  0.20,
  budget:   0.13,
  location: 0.12,
  schedule: 0.09,
  format:   0.08,
  language: 0.07,
  age:      0.06,
  trust:    0.05,
} as const

// Bayesian silliqlash: kam sharhli 5.0 reyting ko'p sharhli 4.5 dan yuqori chiqmasin
const BAYES_PRIOR_COUNT = 10

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

// ─── 1. Maqsad mosligi ────────────────────────────────────────

/**
 * Foydalanuvchi maqsadi (fan/yo'nalish) muassasa nomi, tavsifi, dasturlari
 * yoki mutaxassisliklarida qay darajada uchrashini hisoblaydi.
 * Qattiq filtrlash (ratio > 0) va ballash (scoreGoal) ikkalasida ham
 * qayta ishlatiladi — bitta manba, ikki joyda mos kelmay qolish xavfi yo'q.
 */
export function computeGoalMatch(inst: MatchCandidate, goal: string): { ratio: number; hits: number; total: number } {
  const goalTokens = tokenize(goal)
  const haystack = [
    inst.nameUz,
    inst.nameRu ?? '',
    inst.details?.descriptionUz ?? '',
    ...(inst.details?.programs ?? []),
    ...(inst.details?.specializations ?? []),
  ].join(' ').toLowerCase()

  // Har bir token sinonimlari bilan kengaytiriladi:
  // "химия" → ["kimyo", "chemistry", ...] — qaysi tilda yozilishidan qat'i nazar topiladi
  const hits = goalTokens.filter((tok) =>
    expandSearchTerms(tok).some((variant) => haystack.includes(variant.toLowerCase())),
  )
  return {
    ratio: goalTokens.length > 0 ? hits.length / goalTokens.length : 0,
    hits: hits.length,
    total: goalTokens.length,
  }
}

function scoreGoal(inst: MatchCandidate, prefs: MatchPreferences): ScoreComponent {
  const base = { key: 'goal', labelUz: 'Maqsadga moslik', labelRu: 'Соответствие цели', weight: WEIGHTS.goal }

  if (!prefs.goal?.trim()) {
    // Maqsad kiritilmagan — tur mosligi allaqachon filtrlangan, neytral yuqori
    return {
      ...base, score: 70, hasData: false,
      reasonUz: "Yo'nalish bo'yicha mos", reasonRu: 'Подходит по направлению',
    }
  }

  const { ratio } = computeGoalMatch(inst, prefs.goal)

  if (ratio >= 0.99) {
    return {
      ...base, score: 100, hasData: true,
      reasonUz: `"${prefs.goal}" yo'nalishi mavjud`,
      reasonRu: `Есть направление "${prefs.goal}"`,
    }
  }
  if (ratio > 0) {
    return {
      ...base, score: 65, hasData: true,
      reasonUz: `"${prefs.goal}" ga yaqin dasturlar bor`,
      reasonRu: `Есть близкие к "${prefs.goal}" программы`,
    }
  }
  return {
    ...base, score: 25, hasData: true,
    reasonUz: `"${prefs.goal}" dasturi topilmadi`,
    reasonRu: `Программа "${prefs.goal}" не найдена`,
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
