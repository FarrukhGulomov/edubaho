import { describe, it, expect } from 'vitest'
import { getTestApp } from '../test/app'
import { testPrisma } from '../test/db'
import { testRedis } from '../test/redis'
import { uniqueIp } from '../test/fixtures'

const PHONE = '+998901112233'

// NOTE: /auth/send-otp va /auth/verify-otp o'zining IP-asosidagi rate-limiti
// bor (5/10 so'rov/daqiqa) — testlar BITTA ulashilgan app instance'da
// ishlagani uchun har bir test stsenariysi o'ziga xos `remoteAddress` bilan
// yuboriladi, aks holda testlar bir-birining rate-limit byudjetini band qilib,
// noaniq (bog'liqlik asosida) muvaffaqiyatsizliklarga olib kelardi.

describe('POST /auth/send-otp', () => {
  it('OTP yuboradi va Redisga saqlaydi', async () => {
    const app = await getTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/send-otp',
      payload: { phone: PHONE },
      remoteAddress: uniqueIp(),
    })
    expect(res.statusCode).toBe(200)
    expect(await testRedis.get(`otp:${PHONE}`)).toMatch(/^\d{4,6}$/)
  })

  it("60 soniya ichida qayta so'rasa 429 qaytaradi (cooldown)", async () => {
    const app = await getTestApp()
    const ip = uniqueIp()
    await app.inject({ method: 'POST', url: '/api/v1/auth/send-otp', payload: { phone: PHONE }, remoteAddress: ip })
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/send-otp', payload: { phone: PHONE }, remoteAddress: ip })
    expect(res.statusCode).toBe(429)
  })

  it("noto'g'ri telefon formatini rad etadi", async () => {
    const app = await getTestApp()
    const res = await app.inject({
      method: 'POST', url: '/api/v1/auth/send-otp', payload: { phone: '123' }, remoteAddress: uniqueIp(),
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('POST /auth/verify-otp', () => {
  async function sendOtp(app: Awaited<ReturnType<typeof getTestApp>>, ip: string) {
    await app.inject({ method: 'POST', url: '/api/v1/auth/send-otp', payload: { phone: PHONE }, remoteAddress: ip })
    const otp = await testRedis.get(`otp:${PHONE}`)
    if (!otp) throw new Error('OTP topilmadi')
    return otp
  }

  it("to'g'ri OTP bilan token qaytaradi va userni yaratadi", async () => {
    const app = await getTestApp()
    const ip = uniqueIp()
    const otp = await sendOtp(app, ip)

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verify-otp',
      payload: { phone: PHONE, otp },
      remoteAddress: ip,
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.accessToken).toBeTruthy()

    const user = await testPrisma.user.findUnique({ where: { phone: PHONE } })
    expect(user).toBeTruthy()
  })

  it("noto'g'ri OTP'ni rad etadi", async () => {
    const app = await getTestApp()
    const ip = uniqueIp()
    await sendOtp(app, ip)

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verify-otp',
      payload: { phone: PHONE, otp: '000000' },
      remoteAddress: ip,
    })
    expect(res.statusCode).toBe(400)
  })

  it('OTP FAQAT bir marta ishlatiladi — ikkinchi urinish rad etiladi', async () => {
    const app = await getTestApp()
    const ip = uniqueIp()
    const otp = await sendOtp(app, ip)

    const first = await app.inject({
      method: 'POST', url: '/api/v1/auth/verify-otp', payload: { phone: PHONE, otp }, remoteAddress: ip,
    })
    expect(first.statusCode).toBe(200)

    const second = await app.inject({
      method: 'POST', url: '/api/v1/auth/verify-otp', payload: { phone: PHONE, otp }, remoteAddress: ip,
    })
    expect(second.statusCode).toBe(400)
  })

  it("5 marta noto'g'ri urinishdan keyin OTP bekor qilinadi (brute-force himoyasi)", async () => {
    const app = await getTestApp()
    const ip = uniqueIp()
    const otp = await sendOtp(app, ip)

    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: 'POST', url: '/api/v1/auth/verify-otp', payload: { phone: PHONE, otp: '000000' }, remoteAddress: ip,
      })
    }
    // Endi TO'G'RI OTP bilan urinsa ham rad etilishi kerak — OTP allaqachon o'chirilgan
    const res = await app.inject({
      method: 'POST', url: '/api/v1/auth/verify-otp', payload: { phone: PHONE, otp }, remoteAddress: ip,
    })
    expect(res.statusCode).toBe(400)
  })

  it("muddati tugagan (Redisdan o'chirilgan) OTP'ni rad etadi", async () => {
    const app = await getTestApp()
    const ip = uniqueIp()
    await sendOtp(app, ip)
    await testRedis.del(`otp:${PHONE}`)

    const res = await app.inject({
      method: 'POST', url: '/api/v1/auth/verify-otp', payload: { phone: PHONE, otp: '123456' }, remoteAddress: ip,
    })
    expect(res.statusCode).toBe(400)
  })
})
