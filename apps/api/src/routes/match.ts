import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { computeMatchScore, type MatchCandidate } from '../services/matchService'

/**
 * POST 🔓 /match — EduFit: shaxsiy moslik bo'yicha tavsiya
 *
 * Auth shart emas — mehmon ham foydalanadi (konversiya vositasi).
 * Foydalanuvchi anketasi (tur, maqsad, shahar, byudjet, vaqt, yosh)
 * asosida har bir muassasa uchun 0-100 moslik balli hisoblanadi.
 *
 * Javob shaffof: har bir ball komponenti sabab bilan qaytadi —
 * foydalanuvchi NEGA aynan shu tavsiya chiqqanini ko'radi.
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
    // Viloyat/shahar bo'yicha QATTIQ filtrlamaymiz — joylashuv ballda
    // hisoblanadi, aks holda kichik shaharlarda natija bo'sh chiqadi.
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
      return reply.send({ data: [], meta: { total: 0, globalAvgRating: null } })
    }

    // Bayesian prior: shu turdagi muassasalarning o'rtacha reytingi
    const rated = candidates.filter((c: { avgRating: number | null }) => c.avgRating != null)
    const globalAvg = rated.length > 0
      ? rated.reduce((s: number, c: { avgRating: number | null }) => s + (c.avgRating ?? 0), 0) / rated.length
      : 4.0

    const results = candidates
      .map((c: (typeof candidates)[number]) => {
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
      .sort((a: { match: { score: number } }, b: { match: { score: number } }) => b.match.score - a.match.score)
      .slice(0, prefs.limit)

    return reply.send({
      data: results,
      meta: {
        total: candidates.length,
        globalAvgRating: Math.round(globalAvg * 10) / 10,
      },
    })
  })
}
