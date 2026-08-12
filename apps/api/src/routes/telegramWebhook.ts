import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { env } from '../utils/env'
import { redis } from '../utils/redis'
import { normalizePhone } from '../utils/phone'
import { sendTelegramContactRequest, sendTelegramMessageNoKeyboard } from '../services/telegram'
import { tryQualifyReferral } from '../services/referralService'

/**
 * Telegram bot webhook — telefon raqamni "request_contact" tugmasi orqali
 * TASDIQLASH uchun. Login Widget/Mini App hech qachon haqiqiy telefon
 * bermaydi (faqat id/ism/username) — shu sababli Telegram'ning o'zi
 * kafolatlagan raqamni olishning yagona yo'li shu bot suhbati.
 *
 * OQIM:
 *  1. Sayt (JWT bilan) POST /auth/telegram/verify-phone chaqiradi →
 *     bir martalik token qaytadi → foydalanuvchi t.me/<bot>?start=<token>ga o'tadi
 *  2. Bot "/start <token>" qabul qiladi → Redis'dan token→userId topiladi →
 *     shu chat uchun "kutilmoqda" holati saqlanadi → "raqamni ulashish" tugmasi yuboriladi
 *  3. Foydalanuvchi tugmani bosadi → Telegram `message.contact` yuboradi →
 *     `contact.user_id === from.id` tekshiriladi (faqat O'Z raqami) →
 *     User.phone + phoneVerifiedAt yangilanadi → referral qalifikatsiyasi qayta tekshiriladi
 *
 * Xavfsizlik: Telegram'ning o'zi `secret_token` headerini yuboradi
 * (setWebhook chaqirilganda o'rnatiladi) — soxta so'rovlar rad etiladi.
 */

const PENDING_TTL = 600 // 10 daqiqa — token va chat kutish holati shu muddatda amal qiladi

const updateSchema = z.object({
  message: z.object({
    chat: z.object({ id: z.number() }),
    from: z.object({ id: z.number(), username: z.string().optional() }).optional(),
    text: z.string().optional(),
    contact: z.object({
      phone_number: z.string(),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
      user_id: z.number().optional(),
    }).optional(),
  }).optional(),
})

export default async function telegramWebhookRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify

  fastify.post('/telegram/webhook', async (request, reply) => {
    // Xizmat sozlanmagan yoki secret noto'g'ri bo'lsa — jim rad etamiz
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_WEBHOOK_SECRET) {
      return reply.status(503).send({ ok: false })
    }
    const secret = request.headers['x-telegram-bot-api-secret-token']
    if (secret !== env.TELEGRAM_WEBHOOK_SECRET) {
      return reply.status(401).send({ ok: false })
    }

    // Telegram Update strukturasi juda katta — bizga faqat message qismi kerak,
    // tanimagan maydonlarni e'tiborsiz qoldiramiz (Telegram doim tezkor 200 kutadi)
    const parsed = updateSchema.safeParse(request.body)
    const message = parsed.success ? parsed.data.message : undefined
    if (!message) return reply.send({ ok: true })

    const chatId = String(message.chat.id)
    const botToken = env.TELEGRAM_BOT_TOKEN

    // ── /start <token> — tasdiqlash jarayonini boshlash ──
    const startMatch = message.text?.match(/^\/start\s+verify_(\S+)$/)
    if (startMatch) {
      const token = startMatch[1] as string
      const userId = await redis.get(`tg_verify:${token}`)
      if (!userId) {
        await sendTelegramMessageNoKeyboard(
          botToken, chatId,
          "Havola muddati tugagan. Iltimos, saytga qaytib qaytadan urinib ko'ring.",
        )
        return reply.send({ ok: true })
      }
      // Token bir martalik — darhol o'chiramiz, chat uchun "kutilmoqda" holatini saqlaymiz
      await redis.del(`tg_verify:${token}`)
      await redis.set(`tg_pending:${chatId}`, userId, 'EX', PENDING_TTL)

      await sendTelegramContactRequest(
        botToken, chatId,
        "Telefon raqamingizni tasdiqlash uchun pastdagi tugmani bosing 👇\n\n" +
        "Bu raqam sizning Telegram hisobingizga tegishli ekanini tasdiqlaydi — SMS kod kerak emas.",
      )
      return reply.send({ ok: true })
    }

    // ── contact — foydalanuvchi raqamni ulashdi ──
    if (message.contact) {
      const fromId = message.from?.id
      // Faqat O'Z kartasini yuborgan bo'lsa qabul qilinadi — boshqa birovning
      // kontaktini forward qilib "tasdiqlash"ning oldi olinadi
      if (!fromId || message.contact.user_id !== fromId) {
        await sendTelegramMessageNoKeyboard(
          botToken, chatId,
          "Faqat o'zingizning raqamingizni yuborishingiz mumkin.",
        )
        return reply.send({ ok: true })
      }

      const userId = await redis.get(`tg_pending:${chatId}`)
      if (!userId) {
        await sendTelegramMessageNoKeyboard(
          botToken, chatId,
          "Bu so'rov muddati tugagan. Saytga qaytib qaytadan urinib ko'ring.",
        )
        return reply.send({ ok: true })
      }

      const phone = normalizePhone(message.contact.phone_number)
      if (!phone) {
        await sendTelegramMessageNoKeyboard(botToken, chatId, "Raqam formatini aniqlab bo'lmadi. Qo'llab-quvvatlashga murojaat qiling.")
        return reply.send({ ok: true })
      }

      const telegramId = String(fromId)
      const contactName = [message.contact.first_name, message.contact.last_name].filter(Boolean).join(' ')

      try {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
        await prisma.user.update({
          where: { id: userId },
          data: {
            phone,
            phoneVerifiedAt: new Date(),
            telegramId,
            telegramUsername: message.from?.username ?? undefined,
            isVerified: true,
            // Mavjud ismni bosib yozmaymiz — faqat hali yo'q bo'lsa Telegram'dan olamiz
            ...(user?.name ? {} : contactName ? { name: contactName } : {}),
          },
        })
        await redis.del(`tg_pending:${chatId}`)

        await sendTelegramMessageNoKeyboard(
          botToken, chatId,
          "✅ Raqamingiz muvaffaqiyatli tasdiqlandi! Saytga qaytishingiz mumkin.",
        )

        tryQualifyReferral(prisma, userId).catch((err) => fastify.log.warn(err, 'Referral qualification xatosi'))
      } catch (err: unknown) {
        // P2002: bu raqam yoki Telegram hisobi ALLAQACHON boshqa foydalanuvchida —
        // hisoblarni majburan birlashtirmaymiz, faqat xabar beramiz
        const code = (err as { code?: string })?.code
        if (code === 'P2002') {
          await sendTelegramMessageNoKeyboard(
            botToken, chatId,
            "Bu telefon raqami yoki Telegram hisobi allaqachon boshqa foydalanuvchida ro'yxatdan o'tgan.",
          )
        } else {
          fastify.log.error(err, 'Telegram contact verification xatosi')
        }
      }
      return reply.send({ ok: true })
    }

    return reply.send({ ok: true })
  })
}
