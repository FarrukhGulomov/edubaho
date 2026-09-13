import { describe, it, expect } from 'vitest'
import { getTestApp } from '../../test/app'
import { makeUser, makeInstitution } from '../../test/fixtures'
import { generateTokens } from '../../services/tokens'
import { testPrisma } from '../../test/db'
import { testRedis } from '../../test/redis'

async function superAdminHeaders() {
  const admin = await makeUser({ role: 'SUPER_ADMIN' })
  const { accessToken } = await generateTokens(admin.id, admin.role)
  await testRedis.setex(`admin_verified:${admin.id}`, 3600, '1')
  return { admin, headers: { authorization: `Bearer ${accessToken}` } }
}

function makeLeadEvent(overrides: Partial<{
  sessionId: string; event: string; category: string
  properties: Record<string, unknown>; userId: string | null; institutionId: string | null
}> = {}) {
  return testPrisma.leadEvent.create({
    data: {
      sessionId:  overrides.sessionId ?? 'sess-default',
      event:      overrides.event ?? 'page_view',
      category:   overrides.category ?? 'page',
      properties: overrides.properties,
      userId:     overrides.userId ?? undefined,
      institutionId: overrides.institutionId ?? undefined,
    },
  })
}

describe('GET /super-admin/analytics/summary — isNewUser tuzatilgan hisob', () => {
  it('newRegistrations FAQAT isNewUser:true bo\'lganlarni sanaydi, totalLogins esa barchasini', async () => {
    const app = await getTestApp()
    const { headers } = await superAdminHeaders()

    await makeLeadEvent({ sessionId: 's1', event: 'auth_completed', category: 'auth', properties: { isNewUser: true, method: 'google' } })
    await makeLeadEvent({ sessionId: 's2', event: 'auth_completed', category: 'auth', properties: { isNewUser: false, method: 'telegram' } })
    await makeLeadEvent({ sessionId: 's3', event: 'auth_completed', category: 'auth', properties: { isNewUser: false, method: 'google' } })

    const res = await app.inject({ method: 'GET', url: '/api/v1/super-admin/analytics/summary?days=7', headers })
    expect(res.statusCode).toBe(200)
    const { totals, authByMethod } = res.json().data

    // Avval bu ikkisi bir xil son edi (oddiy auth_completed soni) — endi ajratilgan
    expect(totals.newRegistrations).toBe(1)
    expect(totals.totalLogins).toBe(3)
    expect(authByMethod.google.completed).toBe(2)
    expect(authByMethod.telegram.completed).toBe(1)
  })

  it('institutionContacts — kontaktga bosishlarni sanaydi, lekin mehmon o\'z kontaktini qoldirishini (lead_capture) hisobga olmaydi', async () => {
    const app = await getTestApp()
    const { headers } = await superAdminHeaders()

    await makeLeadEvent({ sessionId: 's1', event: 'contact_click', category: 'engagement', properties: { contactType: 'phone' } })
    await makeLeadEvent({ sessionId: 's1', event: 'contact_click', category: 'engagement', properties: { contactType: 'telegram' } })
    await makeLeadEvent({ sessionId: 's2', event: 'contact_click', category: 'engagement', properties: { contactType: 'lead_capture', phone: '+998901112233' } })

    const res = await app.inject({ method: 'GET', url: '/api/v1/super-admin/analytics/summary?days=7', headers })
    expect(res.json().data.totals.institutionContacts).toBe(2)
  })

  it('trialBookings — shu oyna ichidagi sinov darsi bronlarini sanaydi', async () => {
    const app = await getTestApp()
    const { headers } = await superAdminHeaders()
    const inst = await makeInstitution()

    await testPrisma.trialBooking.create({
      data: { institutionId: inst.id, name: 'Ali', phone: '+998901112233', sessionId: 'sess-1' },
    })

    const res = await app.inject({ method: 'GET', url: '/api/v1/super-admin/analytics/summary?days=7', headers })
    expect(res.json().data.totals.trialBookings).toBe(1)
  })
})

describe('GET /super-admin/analytics/funnel — telefon/OTP bosqichlari olib tashlangan', () => {
  it('endi faqat haqiqiy (Google/Telegram UI\'da mavjud) bosqichlarni qaytaradi', async () => {
    const app = await getTestApp()
    const { headers } = await superAdminHeaders()

    const res = await app.inject({ method: 'GET', url: '/api/v1/super-admin/analytics/funnel?days=7', headers })
    expect(res.statusCode).toBe(200)
    const steps = res.json().data.map((s: { event: string }) => s.event)
    expect(steps).not.toContain('auth_phone_entered')
    expect(steps).not.toContain('auth_otp_sent')
    expect(steps).toEqual(['institution_view', 'gate_shown', 'gate_cta_click', 'auth_started', 'auth_completed'])
  })
})

describe('GET /super-admin/analytics/visitors — "Lidlar"ning ustki to\'plami', () => {
  it('gate_shown KO\'RMAGAN sessiyalar ham ro\'yxatda chiqadi — "Lidlar" ularni chetlab o\'tadi', async () => {
    const app = await getTestApp()
    const { headers } = await superAdminHeaders()

    // Gate ko'rmagan, faqat qidirib chiqib ketgan mehmon
    await makeLeadEvent({ sessionId: 'browsed-only', event: 'search_query', category: 'search', properties: { query: 'IELTS' } })
    // Gate ko'rgan, chinakam lid
    await makeLeadEvent({ sessionId: 'saw-gate', event: 'gate_shown', category: 'gate' })

    const [visitorsRes, leadsRes] = await Promise.all([
      app.inject({ method: 'GET', url: '/api/v1/super-admin/analytics/visitors?days=7', headers }),
      app.inject({ method: 'GET', url: '/api/v1/super-admin/analytics/leads?days=7', headers }),
    ])

    expect(visitorsRes.statusCode).toBe(200)
    const visitorSessionIds = visitorsRes.json().data.map((v: { sessionId: string }) => v.sessionId)
    expect(visitorSessionIds).toContain('browsed-only')
    expect(visitorSessionIds).toContain('saw-gate')

    const leadSessionIds = leadsRes.json().data.map((l: { sessionId: string }) => l.sessionId)
    expect(leadSessionIds).not.toContain('browsed-only')
    expect(leadSessionIds).toContain('saw-gate')
  })

  it('auth holatini to\'g\'ri aniqlaydi: boshlamagan / boshladi / kirdi / xato', async () => {
    const app = await getTestApp()
    const { headers } = await superAdminHeaders()

    await makeLeadEvent({ sessionId: 'not-started', event: 'page_view', category: 'page' })
    await makeLeadEvent({ sessionId: 'started', event: 'auth_started', category: 'auth' })
    await makeLeadEvent({ sessionId: 'completed', event: 'auth_completed', category: 'auth', properties: { isNewUser: true, method: 'google' } })
    await makeLeadEvent({ sessionId: 'errored', event: 'auth_error', category: 'auth', properties: { method: 'telegram', reason: 'x' } })

    const res = await app.inject({ method: 'GET', url: '/api/v1/super-admin/analytics/visitors?days=7', headers })
    const bySession = new Map(res.json().data.map((v: { sessionId: string; authStatus: string }) => [v.sessionId, v.authStatus]))
    expect(bySession.get('not-started')).toBe('not_started')
    expect(bySession.get('started')).toBe('started')
    expect(bySession.get('completed')).toBe('completed')
    expect(bySession.get('errored')).toBe('error')
  })

  it('SUPER_ADMIN bo\'lmagan foydalanuvchini rad etadi', async () => {
    const app = await getTestApp()
    const admin = await makeUser({ role: 'ADMIN' })
    const { accessToken } = await generateTokens(admin.id, admin.role)
    await testRedis.setex(`admin_verified:${admin.id}`, 3600, '1')

    const res = await app.inject({
      method: 'GET', url: '/api/v1/super-admin/analytics/visitors?days=7',
      headers: { authorization: `Bearer ${accessToken}` },
    })
    expect(res.statusCode).toBe(403)
  })
})
