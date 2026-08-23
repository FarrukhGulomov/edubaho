import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { env } from '../utils/env'
import { redis } from '../utils/redis'
import { normalizePhone } from '../utils/phone'
import {
  sendTelegramContactRequest, sendTelegramMessageNoKeyboard,
  sendTelegramMessageWithButtons, answerCallbackQuery,
} from '../services/telegram'
import { tryQualifyReferral, attributeReferral } from '../services/referralService'

/**
 * Telegram bot webhook — botning BARCHA suhbat mantiqi shu yerda:
 *  1) /start menyusi — saytga va asosiy funksiyalarga undovchi tugmalar
 *  2) Telefon raqamni "request_contact" tugmasi orqali TASDIQLASH —
 *     Login Widget/Mini App hech qachon haqiqiy telefon bermaydi (faqat
 *     id/ism/username), shu sababli Telegram'ning o'zi kafolatlagan
 *     raqamni olishning yagona yo'li shu bot suhbati.
 *
 * TASDIQLASH OQIMI — ikki xil boshlanish nuqtasi bor:
 *
 *  A) SAYTDAN boshlangan (foydalanuvchi allaqachon saytda tizimga kirgan,
 *     lekin raqami hali tasdiqlanmagan — masalan Google orqali kirgan):
 *     1. Sayt (JWT bilan) POST /auth/telegram/verify-phone chaqiradi →
 *        bir martalik token qaytadi → foydalanuvchi t.me/<bot>?start=verify_<token>ga o'tadi
 *     2. Bot "/start verify_<token>" qabul qiladi → Redis'dan token→userId
 *        topiladi → shu chat uchun "kutilmoqda" holati saqlanadi →
 *        "raqamni ulashish" tugmasi yuboriladi
 *
 *  B) BOT'DAN boshlangan (foydalanuvchi to'g'ridan-to'g'ri botga kirgan,
 *     saytda hisobi bo'lmasligi ham mumkin):
 *     1. "/start" (parametrsiz) — xush kelibsiz menyusi ko'rsatiladi
 *     2. "📱 Telefon raqamimni tasdiqlash" tugmasi bosiladi (callback_query) →
 *        shu Telegram ID bilan mavjud hisob qidiriladi, topilmasa YANGI
 *        hisob shu yerning o'zida yaratiladi (Login Widget'dagi kabi) →
 *        "kutilmoqda" holati saqlanadi → "raqamni ulashish" tugmasi yuboriladi
 *
 *  Ikkalasida ham keyingi qadam bir xil: foydalanuvchi tugmani bosadi →
 *  Telegram `message.contact` yuboradi → `contact.user_id === from.id`
 *  tekshiriladi (faqat O'Z raqami) → User.phone + phoneVerifiedAt
 *  yangilanadi → referral qalifikatsiyasi qayta tekshiriladi.
 *
 * Referral: "/start ref_<kod>" orqali kelgan bo'lsa, kod shu chat uchun
 * vaqtincha saqlanadi va (B) yo'lida yangi hisob yaratilganda ulanadi.
 * Diqqat: bu yerda IP asosli firibgarlik himoyasi ISHLAMAYDI (barcha bot
 * so'rovlari Telegram serveridan keladi, haqiqiy foydalanuvchi IP'i yo'q) —
 * shuning uchun faqat referralCode → referrer aniq bo'lgan holatlarda
 * ulanadi, qo'shimcha cheklovsiz.
 *
 * Xavfsizlik: Telegram'ning o'zi `secret_token` headerini yuboradi
 * (setWebhook chaqirilganda o'rnatiladi) — soxta so'rovlar rad etiladi.
 */

const PENDING_TTL = 600 // 10 daqiqa — token va chat kutish holati shu muddatda amal qiladi
const REF_PENDING_TTL = 3600 // 1 soat — /start ref_<kod> dan keyin ro'yxatdan o'tishga yetarli vaqt

const updateSchema = z.object({
  message: z.object({
    chat: z.object({ id: z.number() }),
    from: z.object({ id: z.number(), username: z.string().optional(), first_name: z.string().optional(), last_name: z.string().optional() }).optional(),
    text: z.string().optional(),
    contact: z.object({
      phone_number: z.string(),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
      user_id: z.number().optional(),
    }).optional(),
  }).optional(),
  callback_query: z.object({
    id: z.string(),
    data: z.string().optional(),
    message: z.object({ chat: z.object({ id: z.number() }) }),
    from: z.object({ id: z.number(), username: z.string().optional(), first_name: z.string().optional(), last_name: z.string().optional() }),
  }).optional(),
})

const SITE_URL = env.SITE_URL

function welcomeButtons() {
  return [
    [{ text: '🌐 Saytga o\'tish', url: SITE_URL }],
    [{ text: "🎓 Menga mosini top", url: `${SITE_URL}/match` }, { text: '🔍 Qidirish', url: `${SITE_URL}/search` }],
    [{ text: '📱 Telefon raqamimni tasdiqlash', callback_data: 'verify_phone' }],
  ]
}

const WELCOME_TEXT =
  "👋 <b>BilimOn</b>ga xush kelibsiz!\n\n" +
  "O'zbekistondagi maktablar, universitetlar, kurs markazlari va bog'chalarni " +
  "qidiring, solishtiring va sizga eng mos kelganini toping.\n\n" +
  "Quyidagi tugmalardan birini tanlang 👇"

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

    // Telegram Update strukturasi juda katta — bizga faqat message/callback_query
    // qismi kerak, tanimagan maydonlarni e'tiborsiz qoldiramiz (Telegram doim tezkor 200 kutadi)
    const parsed = updateSchema.safeParse(request.body)
    if (!parsed.success) return reply.send({ ok: true })
    const { message, callback_query: callbackQuery } = parsed.data
    const botToken = env.TELEGRAM_BOT_TOKEN

    // ── Callback tugmalar (masalan "📱 Telefon raqamimni tasdiqlash") ──
    if (callbackQuery) {
      const chatId = String(callbackQuery.message.chat.id)
      await answerCallbackQuery(botToken, callbackQuery.id)

      if (callbackQuery.data === 'verify_phone') {
        const fromId = callbackQuery.from.id
        const telegramId = String(fromId)

        // Bu Telegram ID bilan hisob bormi? Bo'lmasa — Login Widget'dagi
        // kabi shu yerning o'zida yaratamiz ("botdan boshlangan" oqim).
        let userId: string
        const existing = await prisma.user.findUnique({ where: { telegramId }, select: { id: true } })
        if (existing) {
          userId = existing.id
        } else {
          const name = [callbackQuery.from.first_name, callbackQuery.from.last_name].filter(Boolean).join(' ')
          const created = await prisma.user.create({
            data: {
              telegramId,
              telegramUsername: callbackQuery.from.username,
              name: name || undefined,
              isVerified: true,
            },
            select: { id: true },
          })
          userId = created.id

          // Pending referral kodi bo'lsa — YANGI hisob uchungina ulanadi
          const refCode = await redis.get(`tg_ref:${chatId}`)
          if (refCode) {
            await attributeReferral(prisma, { referralCode: refCode, referredUserId: userId })
            await redis.del(`tg_ref:${chatId}`)
          }
        }

        await redis.set(`tg_pending:${chatId}`, userId, 'EX', PENDING_TTL)
        await sendTelegramContactRequest(
          botToken, chatId,
          "Telefon raqamingizni tasdiqlash uchun pastdagi tugmani bosing 👇\n\n" +
          "Bu raqam sizning Telegram hisobingizga tegishli ekanini tasdiqlaydi — SMS kod kerak emas.",
        )
      }
      return reply.send({ ok: true })
    }

    if (!message) return reply.send({ ok: true })

    const chatId = String(message.chat.id)

    // ── /start (parametrsiz) — xush kelibsiz menyusi ──
    if (message.text === '/start') {
      await sendTelegramMessageWithButtons(botToken, chatId, WELCOME_TEXT, welcomeButtons())
      return reply.send({ ok: true })
    }

    // ── /start ref_<kod> — referal havolasi orqali kelgan ──
    const refMatch = message.text?.match(/^\/start\s+ref_(\S+)$/)
    if (refMatch) {
      const refCode = refMatch[1] as string
      await redis.set(`tg_ref:${chatId}`, refCode, 'EX', REF_PENDING_TTL)
      await sendTelegramMessageWithButtons(botToken, chatId, WELCOME_TEXT, welcomeButtons())
      return reply.send({ ok: true })
    }

    // ── /start verify_<token> — saytdan boshlangan tasdiqlash jarayoni ──
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
