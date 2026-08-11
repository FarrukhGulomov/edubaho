import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { computeMatchScore, evaluateGoal, DEFAULT_MIN_MATCH_SCORE, type MatchCandidate } from '../services/matchService'
import { getCategoryDef } from '../utils/educationCategories'

/**
 * POST 🔓 /match — EduFit: shaxsiy moslik bo'yicha tavsiya
 *
 * Auth shart emas — mehmon ham foydalanadi (konversiya vositasi).
 * Foydalanuvchi anketasi (tur, maqsad, shahar, byudjet, vaqt, yosh)
 * asosida har bir muassasa uchun 0-100 moslik balli hisoblanadi.
 *
 * Javob shaffof: har bir ball komponenti sabab bilan qaytadi —
 * foydalanuvchi NEGA aynan shu tavsiya chiqqanini ko'radi.
 *
 * QIDIRUV BOSQICHLARI:
 * Real xato: "OTMga kirish" + "Buxoro" so'ralganda faqat IT kurslarini
 * o'qitadigan markaz 67% moslik bilan chiqib ketdi — chunki eski
 * versiyada natija bo'sh chiqsa YO'NALISH shartimi ham yumshatib,
 * mos kelmagan muassasalar ko'rsatilardi. Endi bu yo'q: YO'NALISH
 * (maqsad) QATTIQ filtr — hech qachon yumshatilmaydi. Faqat JOYLASHUV
 * bosqichma-bosqich yumshatiladi (shahar → viloyat → butun O'zbekiston).
 * Agar aynan mos yo'nalishli muassasa hech qayerda topilmasa — bo'sh
 * natija qaytariladi (soxta/yaqin natija bilan to'ldirilmaydi).
 */

const matchSchema = z.object({
  type: z.enum([
    'KINDERGARTEN', 'SCHOOL', 'LYCEUM', 'COLLEGE', 'UNIVERSITY',
    'COURSE_CENTER', 'LANGUAGE_CENTER', 'IT_SCHOOL', 'TUTORING',
    'SPORTS_SCHOOL', 'ARTS_SCHOOL',
  ]),
  goal:     z.string().max(100).optional(),
  cityId:   z.string().max(40).optional(),
  regionId: z.string().max(40).optional(),
  budget:   z.number().int().positive().max(1_000_000_000).optional(),
  shift:    z.enum(['morning', 'afternoon', 'evening', 'weekend']).optional(),
  age:      z.number().int().min(1).max(99).optional(),
  language: z.enum(['uz', 'ru', 'en']).optional(),
  format:   z.enum(['offline', 'online', 'hybrid']).optional(),
  preferPremium: z.boolean().optional(),
  limit:    z.number().int().min(1).max(30).default(12),
})

/**
 * GET 🔓 /match/insights — anketa to'ldirilayotganda LIVE, HAQIQIY ma'lumot
 *
 * Foydalanuvchi hali "Ko'rish" tugmasini bosmasdan turib — masalan faqat
 * fanni ("IELTS") yoki shaharni tanlagandayoq — real platformadagi
 * ma'lumotlarga asoslangan aniq raqamlarni ko'radi: nechta muassasa mos
 * keladi, narx oralig'i qanday, qaysi aniq dastur nomlari topildi.
 * Hech narsa o'ylab topilmaydi — barchasi shu so'rov ichida DB'dan
 * hisoblanadi (soxta/statik "1000+ muassasa" kabi marketing raqamlar emas).
 */
const insightsSchema = z.object({
  type: z.enum([
    'KINDERGARTEN', 'SCHOOL', 'LYCEUM', 'COLLEGE', 'UNIVERSITY',
    'COURSE_CENTER', 'LANGUAGE_CENTER', 'IT_SCHOOL', 'TUTORING',
    'SPORTS_SCHOOL', 'ARTS_SCHOOL',
  ]),
  goal:   z.string().max(100).optional(),
  cityId: z.string().max(40).optional(),
  budget: z.coerce.number().int().positive().max(1_000_000_000).optional(),
  format: z.enum(['offline', 'online', 'hybrid']).optional(),
})

const candidateSelect = {
  id: true,
  nameUz: true,
  nameRu: true,
  slug: true,
  type: true,
  status: true,
  deliveryMode: true,
  isVerified: true,
  avgRating: true,
  reviewCount: true,
  cityId: true,
  regionId: true,
  phone: true,
  address: true,
  city:   { select: { nameUz: true, nameRu: true } },
  details: {
    select: {
      descriptionUz: true, minAge: true, maxAge: true,
      languages: true, programs: true, shifts: true, specializations: true,
      categories: true,
    },
  },
  pricing: { select: { monthlyMin: true, monthlyMax: true, hasDiscount: true } },
  _count: { select: { media: true } },
} as const

function matchesFormat(deliveryMode: string, format: 'offline' | 'online' | 'hybrid'): boolean {
  if (deliveryMode === 'HYBRID') return true
  if (format === 'hybrid') return true
  return (format === 'online') === (deliveryMode === 'ONLINE')
}

export default async function matchRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify

  fastify.get('/match/insights', {
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const q = insightsSchema.parse(request.query)

    const candidates = await prisma.institution.findMany({
      where: { status: { in: ['ACTIVE', 'PREMIUM'] }, type: q.type },
      select: candidateSelect,
      take: 300,
    })

    const totalInThisType = candidates.length

    const hasGoal = !!q.goal?.trim()
    const matchedPrograms: string[] = []
    let matchedCategory: { code: string; labelUz: string; labelRu: string } | null = null

    const goalFiltered = candidates.filter((c) => {
      if (!hasGoal) return true
      const ev = evaluateGoal(c as MatchCandidate, q.goal!)
      if (ev.matched) {
        if (ev.matchedProgram && matchedPrograms.length < 5 && !matchedPrograms.includes(ev.matchedProgram)) {
          matchedPrograms.push(ev.matchedProgram)
        }
        if (!matchedCategory && ev.matchType === 'category' && ev.category) {
          const def = getCategoryDef(ev.category)
          if (def) matchedCategory = { code: def.code, labelUz: def.labelUz, labelRu: def.labelRu }
        }
      }
      return ev.matched
    })

    // Joylashuv: agar shahar tanlangan bo'lsa-yu, aynan shu shaharda mos
    // muassasa topilmasa — bo'sh natija o'rniga butun mamlakat bo'yicha
    // ko'rsatamiz (asosiy /match algoritmi bilan bir xil mantiq), lekin
    // buni "locationRelaxed" bayrog'i orqali shaffof bildiramiz.
    let locationPool = goalFiltered
    let cityCount: number | null = null
    let locationRelaxed = false
    if (q.cityId) {
      const inCity = goalFiltered.filter((c) => c.cityId === q.cityId)
      cityCount = inCity.length
      if (inCity.length > 0) {
        locationPool = inCity
      } else {
        locationRelaxed = goalFiltered.length > 0
      }
    }

    let formatPool = locationPool
    if (q.format) {
      const inFormat = locationPool.filter((c) => matchesFormat(c.deliveryMode, q.format!))
      if (inFormat.length > 0) formatPool = inFormat
    }

    const priced = formatPool.filter((c) => c.pricing?.monthlyMin != null)
    const priceRange = priced.length > 0 ? {
      min: Math.min(...priced.map((c) => c.pricing!.monthlyMin!)),
      max: Math.max(...priced.map((c) => c.pricing!.monthlyMax ?? c.pricing!.monthlyMin!)),
    } : { min: null, max: null }

    const rated = formatPool.filter((c) => c.avgRating != null)
    const avgRating = rated.length > 0
      ? Math.round((rated.reduce((s, c) => s + (c.avgRating ?? 0), 0) / rated.length) * 10) / 10
      : null

    const withinBudgetCount = q.budget != null
      ? formatPool.filter((c) => c.pricing?.monthlyMin != null && c.pricing.monthlyMin <= q.budget!).length
      : null

    const sampleInstitutions = [...formatPool]
      .sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0))
      .slice(0, 3)
      .map((c) => ({
        nameUz: c.nameUz, nameRu: c.nameRu, slug: c.slug,
        avgRating: c.avgRating, city: c.city,
      }))

    return reply.send({
      data: {
        totalInThisType,
        matchingCount: formatPool.length,
        cityCount,
        locationRelaxed,
        matchedCategory,
        matchedPrograms,
        priceRange,
        avgRating,
        withinBudgetCount,
        sampleInstitutions,
      },
    })
  })

  fastify.post('/match', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const prefs = matchSchema.parse(request.body)

    // Nomzodlar: faqat faol muassasalar, tanlangan tur bo'yicha.
    // Shahar/fan bo'yicha filtrlash quyida bosqichma-bosqich amalga oshiriladi.
    const candidates = await prisma.institution.findMany({
      where: {
        status: { in: ['ACTIVE', 'PREMIUM'] },
        type: prefs.type,
      },
      select: candidateSelect,
      take: 300,
    })

    if (candidates.length === 0) {
      return reply.send({
        data: [],
        meta: {
          total: 0, globalAvgRating: null, locationRelaxed: false, usedRegionFallback: false,
          noSpecializationMatch: false, belowThreshold: false, minScore: DEFAULT_MIN_MATCH_SCORE,
        },
      })
    }

    // Bayesian prior: shu turdagi BARCHA muassasalarning o'rtacha reytingi
    // (filtrlangan kichik to'plamga emas, butun platformaga asoslanadi —
    // aks holda kam sonli filtrlangan natijalarda prior beqaror bo'lib qoladi)
    const rated = candidates.filter((c) => c.avgRating != null)
    const globalAvg = rated.length > 0
      ? rated.reduce((s, c) => s + (c.avgRating ?? 0), 0) / rated.length
      : 4.0

    // Tanlangan shaharning viloyatini aniqlaymiz — shahar darajasida natija
    // bo'sh chiqsa, keyingi bosqich aynan shu viloyat bo'yicha bo'lsin
    let selectedRegionId: string | null = null
    if (prefs.cityId) {
      const city = await prisma.city.findUnique({ where: { id: prefs.cityId }, select: { regionId: true } })
      selectedRegionId = city?.regionId ?? null
    }

    // YO'NALISH — QATTIQ FILTR. Hech qachon yumshatilmaydi: foydalanuvchi
    // "IELTS" yoki "OTMga kirish" desa, aynan shuni o'qitmaydigan
    // muassasa reytingi/joylashuvi qanchalik yaxshi bo'lishidan qat'i
    // nazar natijaga chiqmaydi.
    const hasGoal = !!prefs.goal?.trim()
    const goalHit = (c: (typeof candidates)[number]) => !hasGoal || evaluateGoal(c as MatchCandidate, prefs.goal!).matched
    const goalFiltered = candidates.filter(goalHit)

    const inCity = (c: (typeof candidates)[number]) => c.cityId === prefs.cityId
    const inRegion = (c: (typeof candidates)[number]) => !!selectedRegionId && c.regionId === selectedRegionId

    interface Attempt {
      pool: typeof candidates
      locationRelaxed: boolean
      usedRegionFallback: boolean
    }

    const attempts: Array<() => Attempt> = []

    // Onlayn format tanlansa, joylashuv bosqichlari umuman kerak emas —
    // onlayn markaz istalgan shahardan foydalanuvchiga mos, shuning uchun
    // to'g'ridan-to'g'ri butun O'zbekiston bo'yicha qidiruvga o'tamiz
    // ("eng yaxshi onlayn markazlarni butun mamlakat bo'yicha tavsiya qilish")
    const skipLocationTiers = prefs.format === 'online'

    if (prefs.cityId && !skipLocationTiers) {
      // 1) Aynan shu shahar
      attempts.push(() => ({
        pool: goalFiltered.filter((c) => inCity(c)),
        locationRelaxed: false, usedRegionFallback: false,
      }))
      if (selectedRegionId) {
        // 2) Shu viloyat bo'yicha
        attempts.push(() => ({
          pool: goalFiltered.filter((c) => inRegion(c)),
          locationRelaxed: true, usedRegionFallback: true,
        }))
      }
    }
    // 3) Butun O'zbekiston bo'yicha (yo'nalish hamon qattiq qo'llanadi)
    // Onlayn format uchun bu "yumshatish" emas — foydalanuvchi aynan shuni
    // so'ragan, shuning uchun locationRelaxed=true qo'yilmaydi
    attempts.push(() => ({
      pool: goalFiltered,
      locationRelaxed: !!prefs.cityId && !skipLocationTiers, usedRegionFallback: false,
    }))

    let chosen: Attempt = { pool: [], locationRelaxed: false, usedRegionFallback: false }
    for (const make of attempts) {
      const attempt = make()
      if (attempt.pool.length > 0) {
        chosen = attempt
        break
      }
    }

    // Aynan mos yo'nalishli muassasa HECH QAYERDA topilmasa — bo'sh javob
    // qaytariladi. Eski versiyada bu yerda "hech bo'lmasa hammasini
    // ko'rsatamiz" degan zaif fallback bor edi — aynan shu soxta
    // moslikka olib kelgan (masalan faqat IT kurs o'qitadigan markaz
    // "OTMga kirish" so'ralganda chiqib ketardi). Endi sifat > miqdor.
    const noSpecializationMatch = hasGoal && chosen.pool.length === 0

    const scored = chosen.pool
      .map((c) => {
        const candidate: MatchCandidate = {
          ...c,
          mediaCount: c._count.media,
        }
        const match = computeMatchScore(candidate, prefs, globalAvg)
        return {
          institution: {
            id: c.id,
            nameUz: c.nameUz,
            nameRu: c.nameRu,
            slug: c.slug,
            type: c.type,
            isVerified: c.isVerified,
            avgRating: c.avgRating,
            reviewCount: c.reviewCount,
            address: c.address,
            city: c.city,
            pricing: c.pricing,
            deliveryMode: c.deliveryMode,
          },
          match,
        }
      })
      .sort((a, b) => b.match.score - a.match.score)

    // Minimal moslik chegarasi: 45%, 52% kabi zaif natijalar ro'yxatni
    // to'ldirish uchun ko'rsatilmaydi — sifat > miqdor. Chegaradan past
    // qolganlar bo'lsa (lekin qattiq filtrdan o'tgan bo'lsa ham), buni
    // frontendga alohida bayroq bilan bildiramiz.
    const aboveThreshold = scored.filter((r) => r.match.score >= DEFAULT_MIN_MATCH_SCORE)
    const belowThreshold = scored.length > 0 && aboveThreshold.length === 0
    const results = aboveThreshold.slice(0, prefs.limit)

    return reply.send({
      data: results,
      meta: {
        total: aboveThreshold.length,
        globalAvgRating: Math.round(globalAvg * 10) / 10,
        // Frontend shu bayroqlar bilan shaffof izoh ko'rsatishi mumkin:
        // - locationRelaxed/usedRegionFallback: joylashuv yumshatilgani
        // - noSpecializationMatch: aynan so'ralgan yo'nalishni o'qitadigan
        //   muassasa umuman topilmadi
        // - belowThreshold: yo'nalishga mos muassasa bor, lekin umumiy
        //   moslik balli minScore'dan past (zaif tavsiya ko'rsatilmaydi)
        locationRelaxed: chosen.locationRelaxed,
        usedRegionFallback: chosen.usedRegionFallback,
        noSpecializationMatch,
        belowThreshold,
        minScore: DEFAULT_MIN_MATCH_SCORE,
      },
    })
  })
}
