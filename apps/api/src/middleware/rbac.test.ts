import { describe, it, expect } from 'vitest'
import { getTestApp } from '../test/app'
import { makeUser, makeInstitution, uniqueIp } from '../test/fixtures'
import { generateTokens } from '../services/tokens'
import { testRedis } from '../test/redis'

async function authHeader(
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'INSTITUTION_OWNER',
  verifyPin = false,
  institutionId?: string,
) {
  const user = await makeUser({ role })
  const { accessToken } = await generateTokens(user.id, user.role, institutionId)
  if (verifyPin) await testRedis.setex(`admin_verified:${user.id}`, 3600, '1')
  return { headers: { authorization: `Bearer ${accessToken}` }, user }
}

describe('requireAdmin — /admin/* boundary', () => {
  it('oddiy USER 403 oladi', async () => {
    const app = await getTestApp()
    const { headers } = await authHeader('USER')
    const res = await app.inject({ method: 'GET', url: '/api/v1/admin/claims', headers })
    expect(res.statusCode).toBe(403)
  })

  it('ADMIN lekin PIN tasdiqlanmagan bo\'lsa 403 + ADMIN_PIN_REQUIRED', async () => {
    const app = await getTestApp()
    const { headers } = await authHeader('ADMIN', false)
    const res = await app.inject({ method: 'GET', url: '/api/v1/admin/claims', headers })
    expect(res.statusCode).toBe(403)
    expect(res.json().code).toBe('ADMIN_PIN_REQUIRED')
  })

  it('ADMIN + PIN tasdiqlangan bo\'lsa ruxsat beriladi', async () => {
    const app = await getTestApp()
    const { headers } = await authHeader('ADMIN', true)
    const res = await app.inject({ method: 'GET', url: '/api/v1/admin/claims', headers })
    expect(res.statusCode).toBe(200)
  })

  it('token yo\'q bo\'lsa 401', async () => {
    const app = await getTestApp()
    const res = await app.inject({ method: 'GET', url: '/api/v1/admin/claims' })
    expect(res.statusCode).toBe(401)
  })
})

describe('requireSuperAdmin — /super-admin/* boundary', () => {
  it('oddiy ADMIN (super emas) 403 oladi, PIN tasdiqlangan bo\'lsa ham', async () => {
    const app = await getTestApp()
    const { headers } = await authHeader('ADMIN', true)
    const res = await app.inject({ method: 'GET', url: '/api/v1/super-admin/users', headers })
    expect(res.statusCode).toBe(403)
  })

  it('SUPER_ADMIN + PIN tasdiqlangan bo\'lsa ruxsat beriladi', async () => {
    const app = await getTestApp()
    const { headers } = await authHeader('SUPER_ADMIN', true)
    const res = await app.inject({ method: 'GET', url: '/api/v1/super-admin/users', headers })
    expect(res.statusCode).toBe(200)
  })
})

describe('requireB2B — /dashboard/* boundary', () => {
  it('oddiy USER 403 oladi', async () => {
    const app = await getTestApp()
    const { headers } = await authHeader('USER')
    const res = await app.inject({ method: 'GET', url: '/api/v1/dashboard/overview', headers })
    expect(res.statusCode).toBe(403)
  })

  it('INSTITUTION_OWNER (muassasaga bog\'langan) PIN\'siz ham ruxsat oladi (B2B PIN talab qilmaydi)', async () => {
    const app = await getTestApp()
    const inst = await makeInstitution()
    const { headers } = await authHeader('INSTITUTION_OWNER', false, inst.id)
    const res = await app.inject({ method: 'GET', url: '/api/v1/dashboard/overview', headers })
    expect(res.statusCode).toBe(200)
  })
})

describe('POST /auth/admin-pin', () => {
  it('to\'g\'ri PIN admin_verified belgisini o\'rnatadi', async () => {
    const app = await getTestApp()
    const { headers, user } = await authHeader('ADMIN', false)
    const res = await app.inject({
      method: 'POST', url: '/api/v1/auth/admin-pin', headers, payload: { pin: '147258' }, remoteAddress: uniqueIp(),
    })
    expect(res.statusCode).toBe(200)
    expect(await testRedis.get(`admin_verified:${user.id}`)).toBe('1')
  })

  it('noto\'g\'ri PIN rad etiladi va belgi o\'rnatilmaydi', async () => {
    const app = await getTestApp()
    const { headers, user } = await authHeader('ADMIN', false)
    const res = await app.inject({
      method: 'POST', url: '/api/v1/auth/admin-pin', headers, payload: { pin: '000000' }, remoteAddress: uniqueIp(),
    })
    expect(res.statusCode).toBe(401)
    expect(await testRedis.get(`admin_verified:${user.id}`)).toBeNull()
  })

  it('oddiy USER admin-pin so\'ray olmaydi', async () => {
    const app = await getTestApp()
    const { headers } = await authHeader('USER')
    const res = await app.inject({
      method: 'POST', url: '/api/v1/auth/admin-pin', headers, payload: { pin: '147258' }, remoteAddress: uniqueIp(),
    })
    expect(res.statusCode).toBe(403)
  })

  it('5 marta noto\'g\'ri urinishdan keyin 15 daqiqaga bloklanadi', async () => {
    const app = await getTestApp()
    const { headers } = await authHeader('ADMIN', false)
    const ip = uniqueIp()
    for (let i = 0; i < 5; i++) {
      await app.inject({ method: 'POST', url: '/api/v1/auth/admin-pin', headers, payload: { pin: '000000' }, remoteAddress: ip })
    }
    const res = await app.inject({
      method: 'POST', url: '/api/v1/auth/admin-pin', headers, payload: { pin: '147258' }, remoteAddress: ip,
    })
    expect(res.statusCode).toBe(429)
  })
})

describe('POST /auth/setup-super-admin — bootstrap himoyasi', () => {
  it('SUPER_ADMIN mavjud bo\'lmasa, to\'g\'ri PIN bilan birinchi super adminni yaratadi', async () => {
    const app = await getTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/setup-super-admin',
      payload: { phone: '+998901234599', pin: '147258' },
      remoteAddress: uniqueIp(),
    })
    expect(res.statusCode).toBe(200)
  })

  it('SUPER_ADMIN allaqachon mavjud bo\'lsa, to\'g\'ri PIN bilan ham rad etadi', async () => {
    const app = await getTestApp()
    await makeUser({ role: 'SUPER_ADMIN' })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/setup-super-admin',
      payload: { phone: '+998901234598', pin: '147258' },
      remoteAddress: uniqueIp(),
    })
    expect(res.statusCode).toBe(403)
  })

  it('noto\'g\'ri PIN rad etiladi', async () => {
    const app = await getTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/setup-super-admin',
      payload: { phone: '+998901234597', pin: '000000' },
      remoteAddress: uniqueIp(),
    })
    expect(res.statusCode).toBe(401)
  })
})
