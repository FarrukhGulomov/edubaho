import { describe, it, expect } from 'vitest'
import {
  createEnrollmentClaim, approveEnrollmentClaim, rejectEnrollmentClaim, DuplicatePendingClaimError,
} from './enrollmentClaimService'
import { testPrisma } from '../test/db'
import { makeUser, makeInstitution } from '../test/fixtures'

describe('createEnrollmentClaim', () => {
  it('yangi claim yaratadi (PENDING)', async () => {
    const user = await makeUser()
    const inst = await makeInstitution()
    const claim = await createEnrollmentClaim(testPrisma, { userId: user.id, institutionId: inst.id })
    expect(claim.status).toBe('PENDING')
  })

  it('bitta muassasaga ikkinchi PENDING claim yuborishga urinishni rad etadi', async () => {
    const user = await makeUser()
    const inst = await makeInstitution()
    await createEnrollmentClaim(testPrisma, { userId: user.id, institutionId: inst.id })

    await expect(
      createEnrollmentClaim(testPrisma, { userId: user.id, institutionId: inst.id }),
    ).rejects.toBeInstanceOf(DuplicatePendingClaimError)
  })

  it('avvalgi claim REJECTED bo\'lgach, yangi claim yuborish mumkin', async () => {
    const user = await makeUser()
    const inst = await makeInstitution()
    const first = await createEnrollmentClaim(testPrisma, { userId: user.id, institutionId: inst.id })
    await testPrisma.enrollmentClaim.update({ where: { id: first.id }, data: { status: 'REJECTED' } })

    await expect(
      createEnrollmentClaim(testPrisma, { userId: user.id, institutionId: inst.id }),
    ).resolves.toBeTruthy()
  })

  it('boshqa muassasaga PENDING claim yuborishga to\'sqinlik qilmaydi', async () => {
    const user = await makeUser()
    const instA = await makeInstitution()
    const instB = await makeInstitution()
    await createEnrollmentClaim(testPrisma, { userId: user.id, institutionId: instA.id })

    await expect(
      createEnrollmentClaim(testPrisma, { userId: user.id, institutionId: instB.id }),
    ).resolves.toBeTruthy()
  })
})

describe('approveEnrollmentClaim', () => {
  it('PENDING claimni tasdiqlaydi va BITTA EnrollmentReward yaratadi', async () => {
    const user = await makeUser()
    const inst = await makeInstitution()
    const admin = await makeUser({ role: 'ADMIN' })
    const claim = await createEnrollmentClaim(testPrisma, { userId: user.id, institutionId: inst.id })

    const result = await approveEnrollmentClaim(testPrisma, claim.id, admin.id)
    expect(result.ok).toBe(true)

    const updated = await testPrisma.enrollmentClaim.findUnique({ where: { id: claim.id } })
    expect(updated?.status).toBe('APPROVED')

    const rewards = await testPrisma.enrollmentReward.findMany({ where: { claimId: claim.id } })
    expect(rewards).toHaveLength(1)
  })

  it('bir necha marta parallel tasdiqlansa ham FAQAT BITTA mukofot beriladi (idempotent)', async () => {
    const user = await makeUser()
    const inst = await makeInstitution()
    const admin = await makeUser({ role: 'ADMIN' })
    const claim = await createEnrollmentClaim(testPrisma, { userId: user.id, institutionId: inst.id })

    const results = await Promise.all([
      approveEnrollmentClaim(testPrisma, claim.id, admin.id),
      approveEnrollmentClaim(testPrisma, claim.id, admin.id),
      approveEnrollmentClaim(testPrisma, claim.id, admin.id),
    ])
    expect(results.filter((r) => r.ok)).toHaveLength(1)

    const rewards = await testPrisma.enrollmentReward.findMany({ where: { claimId: claim.id } })
    expect(rewards).toHaveLength(1)
  })

  it('allaqachon REJECTED claimni qayta tasdiqlab bo\'lmaydi', async () => {
    const user = await makeUser()
    const inst = await makeInstitution()
    const admin = await makeUser({ role: 'ADMIN' })
    const claim = await createEnrollmentClaim(testPrisma, { userId: user.id, institutionId: inst.id })
    await rejectEnrollmentClaim(testPrisma, claim.id, admin.id, 'test sababi')

    const result = await approveEnrollmentClaim(testPrisma, claim.id, admin.id)
    expect(result.ok).toBe(false)

    const rewards = await testPrisma.enrollmentReward.findMany({ where: { claimId: claim.id } })
    expect(rewards).toHaveLength(0)
  })
})

describe('rejectEnrollmentClaim', () => {
  it('PENDING claimni sabab bilan rad etadi', async () => {
    const user = await makeUser()
    const inst = await makeInstitution()
    const admin = await makeUser({ role: 'ADMIN' })
    const claim = await createEnrollmentClaim(testPrisma, { userId: user.id, institutionId: inst.id })

    const result = await rejectEnrollmentClaim(testPrisma, claim.id, admin.id, 'Dalil yetarli emas')
    expect(result.ok).toBe(true)

    const updated = await testPrisma.enrollmentClaim.findUnique({ where: { id: claim.id } })
    expect(updated?.status).toBe('REJECTED')
    expect(updated?.reviewNote).toBe('Dalil yetarli emas')
  })
})
