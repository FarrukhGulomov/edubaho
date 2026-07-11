import { randomUUID } from 'crypto'
import { env } from '../utils/env'

/**
 * Playmobile orqali SMS OTP yuborish.
 * Development rejimida OTP console'ga chiqariladi.
 */
export async function sendSmsOtp(phone: string, otp: string): Promise<void> {
  const message = `Edula.uz: Tasdiqlash kodi: ${otp}. Hech kimga bermang!`

  if (env.NODE_ENV === 'development' || env.SMS_LOGIN === 'test') {
    // Dev rejimida SMS yuborilmaydi — console'ga chiqariladi
    console.log(`📱 OTP [${phone}]: ${otp}`)
    return
  }

  const credentials = Buffer.from(`${env.SMS_LOGIN}:${env.SMS_PASSWORD}`).toString('base64')

  const response = await fetch(env.SMS_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify({
      messages: [
        {
          recipient: phone.replace('+', ''), // '+998901234567' → '998901234567'
          'message-id': randomUUID(),
          sms: {
            originator: env.SMS_FROM,
            content: { text: message },
          },
        },
      ],
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    console.error(`SMS yuborishda xatolik [${response.status}]: ${body}`)
    throw new Error('SMS yuborib bo\'lmadi. Keyinroq urinib ko\'ring.')
  }
}
