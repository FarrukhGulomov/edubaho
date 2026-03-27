import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

/**
 * POST /track  — Lead analytics event yozish
 *
 * Autentifikatsiya shart emas.
 * Rate limit: 120 req/min per IP (server.ts dagi global limitdan yuqori).
 *
 * Kuzatiladigan voqealar (event):
 *  page_view, search_query, search_result_click,
 *  institution_view, institution_save, institution_compare,
 *  gate_shown, gate_cta_click,
 *  auth_started, auth_phone_entered, auth_otp_sent,
 *  auth_otp_error, auth_completed, auth_abandoned,
 *  contact_click, review_started, review_submitted,
 *  filter_applied, price_viewed, compare_opened
 */

const ALLOWED_EVENTS = new Set([
  // Sahifa
  'page_view',
  // Qidiruv
  'search_query', 'search_filter', 'search_result_click',
  // Muassasa
  'institution_view', 'institution_save', 'institution_compare',
  // Gate (lid konversiya signallari)
  'gate_shown', 'gate_cta_click',
  // Auth funnel
  'auth_started', 'auth_phone_entered', 'auth_otp_sent',
  'auth_otp_error', 'auth_completed', 'auth_abandoned',
  // Engagement (auth bo'lgan userlar)
  'contact_click', 'review_started', 'review_submitted',
  'filter_applied', 'price_viewed', 'compare_opened',
])

const CATEGORIES = new Set([
  'page', 'search', 'institution', 'gate', 'auth', 'engagement',
])

const trackSchema = z.object({
  sessionId:     z.string().min(8).max(64),
  event:         z.string(),
  category:      z.string(),
  properties:    z.record(z.unknown()).optional(),
  institutionId: z.string().optional(),
  page:          z.string().max(500).optional(),
  referrer:      z.string().max(500).optional(),
})

export default async function trackRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify

  fastify.post('/track', {
    config: { rateLimit: { max: 120, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const body = trackSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Noto\'g\'ri so\'rov' })

    const { sessionId, event, category, properties, institutionId, page, referrer } = body.data

    // Faqat ruxsat etilgan voqealarni qabul qilamiz
    if (!ALLOWED_EVENTS.has(event) || !CATEGORIES.has(category)) {
      return reply.status(400).send({ error: 'Noto\'g\'ri voqea nomi' })
    }

    // Ixtiyoriy: JWT dan userId olamiz (xato bo'lsa o'tkazib yuboramiz)
    let userId: string | undefined
    try {
      const auth = request.headers.authorization
      if (auth?.startsWith('Bearer ')) {
        const token = auth.slice(7)
        const decoded = fastify.jwt.decode<{ id: string }>(token)
        if (decoded?.id) userId = decoded.id
      }
    } catch { /* token yo'q yoki noto'g'ri — mehmon sifatida davom etamiz */ }

    const ip = (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      ?? request.ip

    const eventData = {
      sessionId,
      userId:    userId ?? null,
      event,
      category,
      properties: (properties ?? {}) as object,
      page:       page ?? null,
      referrer:   referrer ?? null,
      userAgent:  (request.headers['user-agent'] ?? '').slice(0, 300),
      ip:         ip?.slice(0, 45) ?? null,
    }

    try {
      await prisma.leadEvent.create({
        data: { ...eventData, institutionId: institutionId ?? null },
      })
    } catch (e: unknown) {
      // FK xatosi: institutionId DB'da yo'q — null bilan qayta urinish
      const code = (e as { code?: string }).code
      if (code === 'P2003' && institutionId) {
        await prisma.leadEvent.create({ data: { ...eventData, institutionId: null } })
      } else {
        throw e
      }
    }

    return reply.status(201).send({ ok: true })
  })
}
