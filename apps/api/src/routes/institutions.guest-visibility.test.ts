import { describe, it, expect } from 'vitest'
import { getTestApp } from '../test/app'
import { makeUser, makeInstitution } from '../test/fixtures'
import { generateTokens } from '../services/tokens'

/**
 * Regression test — P0 audit topilmasi (kritik): GET /institutions/:slug
 * mehmon (auth'siz) so'rovchiga telefon/telegram/instagram/email/filial
 * telefonlarini TO'LIQ qaytarardi, chunki route'da hech qanday auth
 * tekshiruvi yo'q edi. Frontenddagi "!isGuest" ko'rsatilishi shunchaki
 * bezak edi — ma'lumot allaqachon SSR payload'da bor edi.
 *
 * Fix: `fastify.optionalAuthenticate` preHandler + auth'siz javobda
 * bog'lanish maydonlari `null` qilinadi.
 */
describe('GET /institutions/:slug — bog\'lanish ma\'lumotlari ko\'rinishi', () => {
  it('mehmon uchun telefon/telegram/instagram/email/filial telefoni null qaytariladi', async () => {
    const app = await getTestApp()
    const inst = await makeInstitution({
      phone: '+998901234567',
      telegram: 'test_center',
      instagram: 'test_center_insta',
      email: 'info@test.uz',
    })

    const res = await app.inject({ method: 'GET', url: `/api/v1/institutions/${inst.slug}` })
    expect(res.statusCode).toBe(200)
    const { data } = res.json()

    expect(data.phone).toBeNull()
    expect(data.phone2).toBeNull()
    expect(data.email).toBeNull()
    expect(data.telegram).toBeNull()
    expect(data.instagram).toBeNull()
    expect(data.website).toBeNull()
    // Boshqa ma'lumotlar (nom, manzil, reyting) hali ham ko'rinishi kerak —
    // faqat BOG'LANISH ma'lumotlari yashiriladi, butun profil emas
    expect(data.nameUz).toBe(inst.nameUz)
    expect(data.slug).toBe(inst.slug)
  })

  it('ro\'yxatdan o\'tgan foydalanuvchi uchun to\'liq ma\'lumot qaytariladi', async () => {
    const app = await getTestApp()
    const inst = await makeInstitution({
      phone: '+998901234567',
      telegram: 'test_center',
    })
    const user = await makeUser()
    const { accessToken } = await generateTokens(user.id, user.role)

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/institutions/${inst.slug}`,
      headers: { authorization: `Bearer ${accessToken}` },
    })
    expect(res.statusCode).toBe(200)
    const { data } = res.json()

    expect(data.phone).toBe('+998901234567')
    expect(data.telegram).toBe('test_center')
  })

  it('noto\'g\'ri/eskirgan token bilan mehmon sifatida davom etadi (rad etmaydi)', async () => {
    const app = await getTestApp()
    const inst = await makeInstitution({ phone: '+998901234567' })

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/institutions/${inst.slug}`,
      headers: { authorization: 'Bearer not-a-real-token' },
    })
    expect(res.statusCode).toBe(200)
    const { data } = res.json()
    expect(data.phone).toBeNull()
  })

  it('bekor qilingan (logout qilingan) token bilan ham mehmon sifatida ko\'rinadi', async () => {
    const app = await getTestApp()
    const inst = await makeInstitution({ phone: '+998901234567' })
    const user = await makeUser()
    const { accessToken } = await generateTokens(user.id, user.role)

    // Logout — access token blacklist'ga qo'shiladi
    const logoutRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: { authorization: `Bearer ${accessToken}` },
    })
    expect(logoutRes.statusCode).toBe(200)

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/institutions/${inst.slug}`,
      headers: { authorization: `Bearer ${accessToken}` },
    })
    expect(res.statusCode).toBe(200)
    const { data } = res.json()
    expect(data.phone).toBeNull()
  })
})
