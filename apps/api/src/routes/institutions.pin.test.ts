import { describe, it, expect } from 'vitest'
import { getTestApp } from '../test/app'
import { makeUser, makeInstitution } from '../test/fixtures'
import { generateTokens } from '../services/tokens'
import { testPrisma } from '../test/db'
import { testRedis } from '../test/redis'

async function adminHeaders() {
  const admin = await makeUser({ role: 'ADMIN' })
  const { accessToken } = await generateTokens(admin.id, admin.role)
  await testRedis.setex(`admin_verified:${admin.id}`, 3600, '1')
  return { admin, headers: { authorization: `Bearer ${accessToken}` } }
}

describe('PATCH /admin/institutions/:id/pin', () => {
  it("muassasani eng tepaga chiqaradi/bekor qiladi (toggle)", async () => {
    const app = await getTestApp()
    const { headers } = await adminHeaders()
    const inst = await makeInstitution()
    expect(inst.isPinned).toBe(false)

    const res1 = await app.inject({ method: 'PATCH', url: `/api/v1/admin/institutions/${inst.id}/pin`, headers })
    expect(res1.statusCode).toBe(200)
    expect(res1.json().isPinned).toBe(true)
    expect((await testPrisma.institution.findUnique({ where: { id: inst.id } }))?.isPinned).toBe(true)

    const res2 = await app.inject({ method: 'PATCH', url: `/api/v1/admin/institutions/${inst.id}/pin`, headers })
    expect(res2.statusCode).toBe(200)
    expect(res2.json().isPinned).toBe(false)
    expect((await testPrisma.institution.findUnique({ where: { id: inst.id } }))?.isPinned).toBe(false)
  })

  it('mavjud bo\'lmagan muassasa uchun 404 qaytaradi', async () => {
    const app = await getTestApp()
    const { headers } = await adminHeaders()
    const res = await app.inject({ method: 'PATCH', url: '/api/v1/admin/institutions/not-a-real-id/pin', headers })
    expect(res.statusCode).toBe(404)
  })
})

describe('GET /institutions — isPinned birinchi guruh bo\'lib chiqishi', () => {
  it('tanlangan saralashdan (reyting) qat\'i nazar pinned muassasa birinchi chiqadi', async () => {
    const app = await getTestApp()
    const high = await makeInstitution({ nameUz: 'Yuqori reyting' })
    const pinned = await makeInstitution({ nameUz: 'Pinned past reyting' })
    await testPrisma.institution.update({ where: { id: high.id }, data: { avgRating: 5.0, reviewCount: 10 } })
    await testPrisma.institution.update({ where: { id: pinned.id }, data: { avgRating: 3.0, reviewCount: 5, isPinned: true } })

    const res = await app.inject({ method: 'GET', url: '/api/v1/institutions?sortBy=rating&limit=50' })
    expect(res.statusCode).toBe(200)
    const ids = res.json().data.map((i: { id: string }) => i.id)
    // Pastroq reytingli, lekin pinned bo'lgan yuqori reytingli pinned bo'lmaganidan OLDIN chiqishi kerak
    expect(ids.indexOf(pinned.id)).toBeLessThan(ids.indexOf(high.id))
  })

  it('sortBy=value (narx-sifat) rejimida ham pinned birinchi chiqadi', async () => {
    const app = await getTestApp()
    const cheapGood = await makeInstitution({ nameUz: 'Arzon va sifatli' })
    const pinned = await makeInstitution({ nameUz: 'Pinned qimmat' })
    await testPrisma.institutionPricing.create({ data: { institutionId: cheapGood.id, monthlyMin: 100000 } })
    await testPrisma.institutionPricing.create({ data: { institutionId: pinned.id, monthlyMin: 5000000 } })
    await testPrisma.institution.update({ where: { id: cheapGood.id }, data: { avgRating: 5.0, reviewCount: 10 } })
    await testPrisma.institution.update({ where: { id: pinned.id }, data: { avgRating: 3.0, reviewCount: 5, isPinned: true } })

    const res = await app.inject({ method: 'GET', url: '/api/v1/institutions?sortBy=value&limit=50' })
    expect(res.statusCode).toBe(200)
    const ids = res.json().data.map((i: { id: string }) => i.id)
    expect(ids.indexOf(pinned.id)).toBeLessThan(ids.indexOf(cheapGood.id))
  })
})
