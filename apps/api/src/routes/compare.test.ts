import { describe, it, expect } from 'vitest'
import { getTestApp } from '../test/app'
import { makeUser, makeInstitution } from '../test/fixtures'
import { generateTokens } from '../services/tokens'

describe('GET /institutions/compare — 2-4 muassasa limiti', () => {
  it("1 ta id bo'lsa rad etiladi (kamida 2 kerak)", async () => {
    const app = await getTestApp()
    const inst = await makeInstitution()
    const res = await app.inject({ method: 'GET', url: `/api/v1/institutions/compare?ids=${inst.id}` })
    expect(res.statusCode).toBe(400)
  })

  it('5 ta id bo\'lsa rad etiladi (ko\'pi bilan 4)', async () => {
    const app = await getTestApp()
    const insts = await Promise.all(Array.from({ length: 5 }, () => makeInstitution()))
    const res = await app.inject({
      method: 'GET', url: `/api/v1/institutions/compare?ids=${insts.map((i) => i.id).join(',')}`,
    })
    expect(res.statusCode).toBe(400)
  })

  it('2-4 oralig\'ida to\'g\'ri ishlaydi', async () => {
    const app = await getTestApp()
    const insts = await Promise.all([makeInstitution(), makeInstitution()])
    const res = await app.inject({
      method: 'GET', url: `/api/v1/institutions/compare?ids=${insts.map((i) => i.id).join(',')}`,
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data).toHaveLength(2)
  })
})

describe('POST /compare/saved — saqlash limiti va autentifikatsiya', () => {
  async function authHeaders() {
    const user = await makeUser()
    const { accessToken } = await generateTokens(user.id, user.role)
    return { authorization: `Bearer ${accessToken}` }
  }

  it('auth\'siz rad etiladi', async () => {
    const app = await getTestApp()
    const insts = await Promise.all([makeInstitution(), makeInstitution()])
    const res = await app.inject({
      method: 'POST', url: '/api/v1/compare/saved',
      payload: { institutionIds: insts.map((i) => i.id) },
    })
    expect(res.statusCode).toBe(401)
  })

  it('1 ta muassasa bilan rad etiladi', async () => {
    const app = await getTestApp()
    const headers = await authHeaders()
    const inst = await makeInstitution()
    const res = await app.inject({
      method: 'POST', url: '/api/v1/compare/saved', headers, payload: { institutionIds: [inst.id] },
    })
    expect(res.statusCode).toBe(400)
  })

  it("5 ta muassasa bilan rad etiladi", async () => {
    const app = await getTestApp()
    const headers = await authHeaders()
    const insts = await Promise.all(Array.from({ length: 5 }, () => makeInstitution()))
    const res = await app.inject({
      method: 'POST', url: '/api/v1/compare/saved', headers,
      payload: { institutionIds: insts.map((i) => i.id) },
    })
    expect(res.statusCode).toBe(400)
  })

  it("mavjud bo'lmagan muassasa id bilan 404 qaytaradi", async () => {
    const app = await getTestApp()
    const headers = await authHeaders()
    const inst = await makeInstitution()
    const res = await app.inject({
      method: 'POST', url: '/api/v1/compare/saved', headers,
      payload: { institutionIds: [inst.id, 'not-a-real-id'] },
    })
    expect(res.statusCode).toBe(404)
  })

  it('2-4 oralig\'ida muvaffaqiyatli saqlanadi', async () => {
    const app = await getTestApp()
    const headers = await authHeaders()
    const insts = await Promise.all([makeInstitution(), makeInstitution(), makeInstitution()])
    const res = await app.inject({
      method: 'POST', url: '/api/v1/compare/saved', headers,
      payload: { institutionIds: insts.map((i) => i.id) },
    })
    expect(res.statusCode).toBe(201)
  })
})
