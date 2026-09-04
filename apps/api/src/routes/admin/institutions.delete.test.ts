import { describe, it, expect } from 'vitest'
import { getTestApp } from '../../test/app'
import { makeUser, makeInstitution } from '../../test/fixtures'
import { generateTokens } from '../../services/tokens'
import { testPrisma } from '../../test/db'
import { testRedis } from '../../test/redis'
import { mergeInstitutions } from '../../services/mergeInstitutionService'

async function adminHeaders() {
  const admin = await makeUser({ role: 'ADMIN' })
  const { accessToken } = await generateTokens(admin.id, admin.role)
  await testRedis.setex(`admin_verified:${admin.id}`, 3600, '1')
  return { admin, headers: { authorization: `Bearer ${accessToken}` } }
}

describe('DELETE /admin/institutions/:id', () => {
  it('bog\'liq yozuvi yo\'q muassasani o\'chiradi', async () => {
    const app = await getTestApp()
    const { headers } = await adminHeaders()
    const inst = await makeInstitution()

    const res = await app.inject({ method: 'DELETE', url: `/api/v1/admin/institutions/${inst.id}`, headers })
    expect(res.statusCode).toBe(200)
    expect(await testPrisma.institution.findUnique({ where: { id: inst.id } })).toBeNull()
  })

  it(
    'regressiya: EnrollmentClaim (+ EnrollmentReward) bog\'langan muassasani ham xatosiz o\'chiradi ' +
    '(avval FK cheklovi tufayli 500 xato berardi)',
    async () => {
      const app = await getTestApp()
      const { headers } = await adminHeaders()
      const inst = await makeInstitution()
      const claimant = await makeUser()
      const claim = await testPrisma.enrollmentClaim.create({
        data: { userId: claimant.id, institutionId: inst.id, status: 'APPROVED' },
      })
      await testPrisma.enrollmentReward.create({
        data: { claimId: claim.id, userId: claimant.id, amount: 10000 },
      })

      const res = await app.inject({ method: 'DELETE', url: `/api/v1/admin/institutions/${inst.id}`, headers })
      expect(res.statusCode).toBe(200)
      expect(await testPrisma.institution.findUnique({ where: { id: inst.id } })).toBeNull()
      // Bu yerda claim/reward oddiy o'chiriladi (FK cheklovini yechish uchun
      // yetarli) — moliyaviy tarixni SAQLAB QOLISH kerak bo'lgan holat (ikkita
      // real muassasani birlashtirish) alohida quyidagi mergeInstitutions
      // testida tekshiriladi, u yerda reassign qilinadi, o'chirilmaydi.
      expect(await testPrisma.enrollmentClaim.findUnique({ where: { id: claim.id } })).toBeNull()
      expect(await testPrisma.enrollmentReward.findUnique({ where: { claimId: claim.id } })).toBeNull()
    },
  )

  it('regressiya: TrialBooking bog\'langan muassasani ham xatosiz o\'chiradi', async () => {
    const app = await getTestApp()
    const { headers } = await adminHeaders()
    const inst = await makeInstitution()
    await testPrisma.trialBooking.create({
      data: { institutionId: inst.id, name: 'Test', phone: '+998901234567' },
    })

    const res = await app.inject({ method: 'DELETE', url: `/api/v1/admin/institutions/${inst.id}`, headers })
    expect(res.statusCode).toBe(200)
  })

  it('mavjud bo\'lmagan muassasa uchun 404 qaytaradi', async () => {
    const app = await getTestApp()
    const { headers } = await adminHeaders()
    const res = await app.inject({ method: 'DELETE', url: '/api/v1/admin/institutions/not-a-real-id', headers })
    expect(res.statusCode).toBe(404)
  })
})

describe('mergeInstitutions — EnrollmentClaim reassignment regression', () => {
  it('duplicate\'dagi EnrollmentClaim primary\'ga ko\'chiriladi, o\'chirilmaydi (moliyaviy dalil yo\'qolmasligi kerak)', async () => {
    const primary = await makeInstitution()
    const duplicate = await makeInstitution()
    const claimant = await makeUser()
    const claim = await testPrisma.enrollmentClaim.create({
      data: { userId: claimant.id, institutionId: duplicate.id, status: 'APPROVED' },
    })
    await testPrisma.enrollmentReward.create({
      data: { claimId: claim.id, userId: claimant.id, amount: 10000 },
    })

    await mergeInstitutions(testPrisma, primary.id, duplicate.id)

    expect(await testPrisma.institution.findUnique({ where: { id: duplicate.id } })).toBeNull()
    const movedClaim = await testPrisma.enrollmentClaim.findUnique({ where: { id: claim.id } })
    expect(movedClaim?.institutionId).toBe(primary.id)
    const reward = await testPrisma.enrollmentReward.findUnique({ where: { claimId: claim.id } })
    expect(reward).toBeTruthy()
  })
})
