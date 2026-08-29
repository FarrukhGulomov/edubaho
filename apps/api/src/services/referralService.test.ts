import { describe, it, expect } from 'vitest'
import {
  attributeReferral, tryQualifyReferral, getAvailableBalance, getOrCreateReferralCode,
} from './referralService'
import { testPrisma } from '../test/db'
import { makeUser } from '../test/fixtures'

async function makeActiveUser(referralCode?: string) {
  const referrer = await testPrisma.user.create({
    data: { phone: `+998${Math.floor(1e8 + Math.random() * 8e8)}`, name: 'Referrer', referralCode },
  })
  return referrer
}

describe('attributeReferral', () => {
  it("to'g'ri kod bilan Referral(PENDING) yaratadi", async () => {
    const referrer = await makeActiveUser('TESTCODE1')
    const referred = await makeUser({ referralCode: null })

    await attributeReferral(testPrisma, { referralCode: 'TESTCODE1', referredUserId: referred.id })

    const referral = await testPrisma.referral.findUnique({ where: { referredUserId: referred.id } })
    expect(referral?.status).toBe('PENDING')
    expect(referral?.referrerId).toBe(referrer.id)
  })

  it("o'zini-o'zi referral qilishga urinishni jimgina rad etadi", async () => {
    const user = await makeActiveUser('SELFCODE1')

    await attributeReferral(testPrisma, { referralCode: 'SELFCODE1', referredUserId: user.id })

    const referral = await testPrisma.referral.findUnique({ where: { referredUserId: user.id } })
    expect(referral).toBeNull()
  })

  it("mavjud bo'lmagan kodni jimgina o'tkazib yuboradi (xato tashlamaydi)", async () => {
    const referred = await makeUser()
    await expect(
      attributeReferral(testPrisma, { referralCode: 'YOQKODI999', referredUserId: referred.id }),
    ).resolves.not.toThrow()
    expect(await testPrisma.referral.findUnique({ where: { referredUserId: referred.id } })).toBeNull()
  })

  it('kod berilmasa hech narsa qilmaydi', async () => {
    const referred = await makeUser()
    await attributeReferral(testPrisma, { referralCode: null, referredUserId: referred.id })
    expect(await testPrisma.referral.findUnique({ where: { referredUserId: referred.id } })).toBeNull()
  })

  it('bir foydalanuvchi uchun ikkinchi marta chaqirilsa ham referrer o\'zgarmaydi (P2002 tolerant)', async () => {
    const referrerA = await makeActiveUser('CODEA1111')
    const referrerB = await makeActiveUser('CODEB2222')
    const referred = await makeUser()

    await attributeReferral(testPrisma, { referralCode: 'CODEA1111', referredUserId: referred.id })
    await attributeReferral(testPrisma, { referralCode: 'CODEB2222', referredUserId: referred.id })

    const referral = await testPrisma.referral.findUnique({ where: { referredUserId: referred.id } })
    expect(referral?.referrerId).toBe(referrerA.id)
    expect(referral?.referrerId).not.toBe(referrerB.id)
  })
})

describe('tryQualifyReferral — ACTIVE USER aniqlash va mukofot idempotentligi', () => {
  async function setupPendingReferral() {
    const referrer = await makeActiveUser('QUALCODE1')
    const referred = await makeUser({ referralCode: null, name: null, phoneVerifiedAt: null })
    await testPrisma.referral.create({
      data: { referrerId: referrer.id, referredUserId: referred.id, referralCode: 'QUALCODE1' },
    })
    return { referrer, referred }
  }

  it('uchta shart (ism/tasdiqlangan telefon/qualifying activity) bajarilmasa QUALIFIED bo\'lmaydi', async () => {
    const { referred } = await setupPendingReferral()
    await tryQualifyReferral(testPrisma, referred.id)

    const referral = await testPrisma.referral.findUnique({ where: { referredUserId: referred.id } })
    expect(referral?.status).toBe('PENDING')
  })

  it('uchala shart bajarilganda QUALIFIED bo\'ladi va BITTA ReferralReward yaratiladi', async () => {
    const { referrer, referred } = await setupPendingReferral()
    await testPrisma.user.update({
      where: { id: referred.id },
      data: { name: 'Referred User', phone: '+998907776655', phoneVerifiedAt: new Date() },
    })
    await testPrisma.leadEvent.create({
      data: { userId: referred.id, event: 'match_completed', sessionId: 'test-session', category: 'engagement' },
    })

    await tryQualifyReferral(testPrisma, referred.id)

    const referral = await testPrisma.referral.findUnique({ where: { referredUserId: referred.id } })
    expect(referral?.status).toBe('QUALIFIED')

    const rewards = await testPrisma.referralReward.findMany({ where: { referralId: referral!.id } })
    expect(rewards).toHaveLength(1)
    expect(rewards[0]?.userId).toBe(referrer.id)
  })

  it('bir necha marta ketma-ket chaqirilsa ham FAQAT BITTA mukofot beriladi (idempotent)', async () => {
    const { referred } = await setupPendingReferral()
    await testPrisma.user.update({
      where: { id: referred.id },
      data: { name: 'Referred User', phone: '+998907776655', phoneVerifiedAt: new Date() },
    })
    await testPrisma.leadEvent.create({ data: { userId: referred.id, event: 'match_completed', sessionId: 'test-session', category: 'engagement' } })

    await Promise.all([
      tryQualifyReferral(testPrisma, referred.id),
      tryQualifyReferral(testPrisma, referred.id),
      tryQualifyReferral(testPrisma, referred.id),
    ])

    const referral = await testPrisma.referral.findUnique({ where: { referredUserId: referred.id } })
    const rewards = await testPrisma.referralReward.findMany({ where: { referralId: referral!.id } })
    expect(rewards).toHaveLength(1)
  })
})

describe('getAvailableBalance', () => {
  it('referral + enrollment + adjustment yig\'indisidan yechib olishlarni ayiradi', async () => {
    const user = await makeUser()
    const other = await makeUser()
    const referral = await testPrisma.referral.create({
      data: { referrerId: user.id, referredUserId: other.id, referralCode: 'X', status: 'QUALIFIED' },
    })
    await testPrisma.referralReward.create({ data: { referralId: referral.id, userId: user.id, amount: 500 } })
    await testPrisma.bcnAdjustment.create({ data: { userId: user.id, amount: 1000, reason: 'test', adminId: user.id } })
    await testPrisma.referralWithdrawal.create({
      data: { userId: user.id, amount: 300, paymentMethod: 'card', paymentDetails: 'x', status: 'PENDING' },
    })

    const balance = await getAvailableBalance(testPrisma, user.id)
    expect(balance).toBe(500 + 1000 - 300)
  })

  it('CANCELLED mukofotlarni hisobga olmaydi', async () => {
    const user = await makeUser()
    const other = await makeUser()
    const referral = await testPrisma.referral.create({
      data: { referrerId: user.id, referredUserId: other.id, referralCode: 'Y', status: 'QUALIFIED' },
    })
    await testPrisma.referralReward.create({
      data: { referralId: referral.id, userId: user.id, amount: 500, status: 'CANCELLED' },
    })

    expect(await getAvailableBalance(testPrisma, user.id)).toBe(0)
  })
})

describe('getOrCreateReferralCode', () => {
  it('mavjud kod bo\'lsa o\'shani qaytaradi', async () => {
    const user = await makeUser({ referralCode: 'EXISTING1' })
    expect(await getOrCreateReferralCode(testPrisma, user.id)).toBe('EXISTING1')
  })

  it('kod yo\'q bo\'lsa yangi yaratadi va saqlaydi', async () => {
    const user = await makeUser({ referralCode: null })
    const code = await getOrCreateReferralCode(testPrisma, user.id)
    expect(code).toHaveLength(8)
    const updated = await testPrisma.user.findUnique({ where: { id: user.id } })
    expect(updated?.referralCode).toBe(code)
  })
})
