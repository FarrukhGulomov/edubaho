import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { computeMatchScore, computeGoalMatch, type MatchCandidate } from '../services/matchService'

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
 * QIDIRUV BOSQICHLARI (progressiv yumshatish):
 * Foydalanuvchi "Buxoro" tanlasa yoki aniq fan/yo'nalish yozsa, natijalar
 * shu shartlarga QAT'IY mos bo'lishi kerak — aks holda "top darajadagi"
 * tavsiya emas, tasodifiy ro'yxat bo'lib qoladi. Shu sababli avval eng
 * qat'iy shartlar (shahar + yo'nalish) bilan qidiramiz; agar natija bo'sh
 * chiqsa, birma-bir yumshatamiz (viloyat → butun O'zbekiston, yo'nalish
 * mosligi → istalgan). Har bir bosqichda QAYSI shartlar yumshatilgani
 * javobda ko'rsatiladi — natijalar hech qachon jim aralashtirilmaydi.
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
  limit:    z.number().int().min(1).max(30).default(12),
})

export default async function matchRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify

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
      select: {
        id: true,
        nameUz: true,
        nameRu: true,
        slug: true,
        type: true,
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
          },
        },
        pricing: { select: { monthlyMin: true, monthlyMax: true } },
        _count: { select: { media: true } },
      },
      take: 300,
    })

    if (candidates.length === 0) {
      return reply.send({
        data: [],
        meta: { total: 0, globalAvgRating: null, locationRelaxed: false, subjectRelaxed: false, usedRegionFallback: false },
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

    const hasGoal = !!prefs.goal?.trim()
    const goalHit = (c: (typeof candidates)[number]) => !hasGoal || computeGoalMatch(c as MatchCandidate, prefs.goal!).ratio > 0
    const inCity = (c: (typeof candidates)[number]) => c.cityId === prefs.cityId
    const inRegion = (c: (typeof candidates)[number]) => !!selectedRegionId && c.regionId === selectedRegionId

    interface Attempt {
      pool: typeof candidates
      locationRelaxed: boolean
      subjectRelaxed: boolean
      usedRegionFallback: boolean
    }

    const attempts: Array<() => Attempt> = []

    if (prefs.cityId) {
      // 1) Aynan shu shahar + yo'nalish mos
      attempts.push(() => ({
        pool: candidates.filter((c) => inCity(c) && goalHit(c)),
        locationRelaxed: false, subjectRelaxed: false, usedRegionFallback: false,
      }))
      if (hasGoal) {
        // 2) Aynan shu shahar, yo'nalish yumshatiladi
        attempts.push(() => ({
          pool: candidates.filter((c) => inCity(c)),
          locationRelaxed: false, subjectRelaxed: true, usedRegionFallback: false,
        }))
      }
      if (selectedRegionId) {
        // 3) Shu viloyat bo'yicha + yo'nalish mos
        attempts.push(() => ({
          pool: candidates.filter((c) => inRegion(c) && goalHit(c)),
          locationRelaxed: true, subjectRelaxed: false, usedRegionFallback: true,
        }))
        if (hasGoal) {
          // 4) Shu viloyat bo'yicha, yo'nalish yumshatiladi
          attempts.push(() => ({
            pool: candidates.filter((c) => inRegion(c)),
            locationRelaxed: true, subjectRelaxed: true, usedRegionFallback: true,
          }))
        }
      }
    }
    // 5) Butun O'zbekiston bo'yicha + yo'nalish mos
    attempts.push(() => ({
      pool: candidates.filter((c) => goalHit(c)),
      locationRelaxed: !!prefs.cityId, subjectRelaxed: false, usedRegionFallback: false,
    }))
    if (hasGoal) {
      // 6) So'nggi chora: butun mamlakat, yo'nalish yumshatiladi
      attempts.push(() => ({
        pool: candidates,
        locationRelaxed: !!prefs.cityId, subjectRelaxed: true, usedRegionFallback: false,
      }))
    }

    let chosen: Attempt = { pool: [], locationRelaxed: false, subjectRelaxed: false, usedRegionFallback: false }
    for (const make of attempts) {
      const attempt = make()
      if (attempt.pool.length > 0) {
        chosen = attempt
        break
      }
    }
    // Shu turdagi muassasa umuman shunday shartlarga to'g'ri kelmasa —
    // bo'sh javob o'rniga hech bo'lmasa turi mos barcha nomzodlarni ko'rsatamiz
    if (chosen.pool.length === 0) {
      chosen = { pool: candidates, locationRelaxed: !!prefs.cityId, subjectRelaxed: hasGoal, usedRegionFallback: false }
    }

    const results = chosen.pool
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
          },
          match,
        }
      })
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, prefs.limit)

    return reply.send({
      data: results,
      meta: {
        total: chosen.pool.length,
        globalAvgRating: Math.round(globalAvg * 10) / 10,
        // Frontend shu bayroqlar bilan "Buxoroda hali topilmadi, yaqin
        // natijalarni ko'rsatmoqdamiz" kabi shaffof izoh ko'rsatishi mumkin
        locationRelaxed: chosen.locationRelaxed,
        subjectRelaxed: chosen.subjectRelaxed,
        usedRegionFallback: chosen.usedRegionFallback,
      },
    })
  })
}
