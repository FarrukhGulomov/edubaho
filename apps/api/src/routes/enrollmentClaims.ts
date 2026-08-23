import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import sharp from 'sharp'
import { createEnrollmentClaim, DuplicatePendingClaimError } from '../services/enrollmentClaimService'
import { isStorageConfigured, uploadImage } from '../services/storageService'
import { ENROLLMENT_REWARD_UZS } from '../config/enrollment'

const ALLOWED_RECEIPT_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])

/**
 * Enrollment Claims — "Men kurs sotib oldim" (foydalanuvchi tomonidan).
 *
 * POST 🔑 /enrollment-claims/receipt — chek/skrinshot yuklash (ixtiyoriy, oldindan)
 * POST 🔑 /enrollment-claims        — yangi claim yuborish
 * GET  🔑 /enrollment-claims/me     — o'z claim'lari tarixi
 */
export default async function enrollmentClaimRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify

  fastify.addHook('preHandler', fastify.authenticate)

  // ─────────────────────────────────────────────
  // POST /enrollment-claims/receipt — chek/skrinshot yuklash
  // ─────────────────────────────────────────────

  fastify.post('/enrollment-claims/receipt', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    if (!isStorageConfigured()) {
      return reply.status(503).send({
        error: "Fayl saqlash xizmati sozlanmagan. Chek yuklamasdan ham xabar yuborishingiz mumkin.",
      })
    }

    const { id: userId } = request.user as { id: string }
    const part = await request.file()
    if (!part) return reply.status(400).send({ error: 'Fayl topilmadi' })
    if (!ALLOWED_RECEIPT_MIME.has(part.mimetype)) {
      return reply.status(400).send({ error: "Qo'llab-quvvatlanmaydigan fayl turi (JPEG/PNG/WebP kerak)" })
    }

    const raw = await part.toBuffer()
    let optimized: Buffer
    try {
      optimized = await sharp(raw).rotate().resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 85 }).toBuffer()
    } catch {
      return reply.status(400).send({ error: "Rasm sifatida o'qib bo'lmadi" })
    }

    const url = await uploadImage(optimized, `enrollment-receipts/${userId}/${randomUUID()}.webp`, 'image/webp')
    return reply.send({ data: { url } })
  })

  // ─────────────────────────────────────────────
  // POST /enrollment-claims — yangi claim
  // ─────────────────────────────────────────────

  const createSchema = z.object({
    institutionId: z.string().min(1, 'Muassasa tanlanishi shart'),
    courseNote:    z.string().max(300).optional(),
    receiptUrl:    z.string().url().optional(),
  })

  fastify.post('/enrollment-claims', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const { id: userId } = request.user as { id: string }

    // MUHIM: .parse() emas .safeParse() — global xato handleriga tayanmasdan
    // to'g'ridan-to'g'ri toza 400 qaytaramiz (ba'zi muhitlarda Fastify'ning
    // global setErrorHandler'i barqaror ishlamasligi kuzatildi)
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0]?.message ?? "Kiritilgan ma'lumotlar noto'g'ri" })
    }
    const { institutionId, courseNote, receiptUrl } = parsed.data

    const institution = await prisma.institution.findUnique({
      where: { id: institutionId },
      select: { id: true },
    })
    if (!institution) return reply.status(404).send({ error: 'Muassasa topilmadi' })

    try {
      const claim = await createEnrollmentClaim(prisma, { userId, institutionId, courseNote, receiptUrl })
      return reply.status(201).send({
        data: claim,
        message: `Xabaringiz qabul qilindi! Admin tasdiqlagach, balansingizga ${fmtUzs(ENROLLMENT_REWARD_UZS)} bonus qo'shiladi.`,
      })
    } catch (err) {
      if (err instanceof DuplicatePendingClaimError) {
        return reply.status(409).send({
          error: "Shu muassasa uchun allaqachon ko'rib chiqilayotgan xabaringiz bor. Natijani kuting.",
        })
      }
      throw err
    }
  })

  // ─────────────────────────────────────────────
  // GET /enrollment-claims/me
  // ─────────────────────────────────────────────

  fastify.get('/enrollment-claims/me', async (request, reply) => {
    const { id: userId } = request.user as { id: string }

    const claims = await prisma.enrollmentClaim.findMany({
      where: { userId },
      select: {
        id: true,
        courseNote: true,
        status: true,
        reviewNote: true,
        createdAt: true,
        reviewedAt: true,
        institution: { select: { id: true, nameUz: true, slug: true } },
        reward: { select: { amount: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return reply.send({ data: claims, meta: { rewardAmount: ENROLLMENT_REWARD_UZS } })
  })
}

function fmtUzs(n: number): string {
  return `${n.toLocaleString('ru-RU').replace(/,/g, ' ')} so'm`
}
