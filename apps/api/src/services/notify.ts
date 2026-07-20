import type { PrismaClient } from '@prisma/client'
import { env } from '../utils/env'
import { sendTelegramMessage } from './telegram'

interface NotifyInput {
  userId: string
  type: string
  title: string
  body: string
  data?: Record<string, unknown>
}

/**
 * Foydalanuvchiga bildirishnoma yuboradi: har doim `Notification` jadvaliga
 * yoziladi (profil/bildirishnomalar ro'yxati uchun), va agar foydalanuvchi
 * Telegram orqali bog'langan bo'lsa — qo'shimcha ravishda bot orqali ham
 * yuboriladi (proaktiv push). Fire-and-forget: asosiy so'rovni bloklamaydi,
 * xatolik chiqsa ham asosiy amal (masalan sharhni tasdiqlash) davom etadi.
 */
export function notifyUser(prisma: PrismaClient, input: NotifyInput): void {
  void (async () => {
    try {
      await prisma.notification.create({
        data: {
          userId: input.userId,
          type: input.type,
          title: input.title,
          body: input.body,
          data: input.data as never,
        },
      })

      if (!env.TELEGRAM_BOT_TOKEN) return
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { telegramId: true },
      })
      if (!user?.telegramId) return

      await sendTelegramMessage(
        env.TELEGRAM_BOT_TOKEN,
        user.telegramId,
        `<b>${escapeHtml(input.title)}</b>\n${escapeHtml(input.body)}`,
      )
    } catch {
      // Bildirishnoma xatoligi asosiy amalni to'xtatmasligi kerak
    }
  })()
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
