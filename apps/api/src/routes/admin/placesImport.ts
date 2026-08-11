import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { isPlacesImportConfigured, searchPlaces, getPlaceDetails } from '../../services/placesImportService'

/**
 * Admin Import Yordamchisi — Google Places orqali yangi muassasa
 * qo'shishda qidiruv (nom/manzil/koordinata/telefon formaga qo'lda
 * ko'chirish uchun). DB'ga hech narsa avtomatik yozilmaydi.
 *
 * GET /admin/places-import/search?q=...    — qidiruv natijalari (qisqa)
 * GET /admin/places-import/details/:placeId — tanlangan joy uchun to'liq (telefon/veb-sayt bilan)
 *
 * Har ikkalasi ham 🛡️ ADMIN roli talab qiladi va alohida qattiq rate-limit
 * bilan himoyalangan — har bir so'rov Google'da pullik (billing) hisoblanadi.
 */
export default async function adminPlacesImportRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.requireAdmin)

  const searchSchema = z.object({
    q: z.string().min(2, 'Kamida 2 belgi kiriting').max(200),
  })

  fastify.get('/admin/places-import/search', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    if (!isPlacesImportConfigured()) {
      return reply.status(503).send({ error: 'Google Places integratsiyasi sozlanmagan (GOOGLE_PLACES_API_KEY yo\'q)' })
    }

    const { q } = searchSchema.parse(request.query)

    try {
      const results = await searchPlaces(q)
      return reply.send({ data: results })
    } catch (err) {
      fastify.log.warn(err, 'Google Places qidiruvida xato')
      const reason = err instanceof Error ? err.message : ''
      return reply.status(502).send({ error: `Google Places bilan bog'lanishda xatolik${reason ? ' (' + reason + ')' : ''}` })
    }
  })

  fastify.get<{ Params: { placeId: string } }>('/admin/places-import/details/:placeId', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    if (!isPlacesImportConfigured()) {
      return reply.status(503).send({ error: 'Google Places integratsiyasi sozlanmagan (GOOGLE_PLACES_API_KEY yo\'q)' })
    }

    const { placeId } = request.params
    if (!placeId) {
      return reply.status(400).send({ error: "place_id ko'rsatilmagan" })
    }

    try {
      const details = await getPlaceDetails(placeId)
      return reply.send({ data: details })
    } catch (err) {
      fastify.log.warn(err, 'Google Places tafsilotlarida xato')
      const reason = err instanceof Error ? err.message : ''
      return reply.status(502).send({ error: `Google Places bilan bog'lanishda xatolik${reason ? ' (' + reason + ')' : ''}` })
    }
  })
}
