import { describe, it, expect } from 'vitest'
import { createReview, voteReview, approveReview, rejectReview } from './reviewService'
import { testPrisma } from '../test/db'
import { makeUser, makeInstitution } from '../test/fixtures'

describe('createReview — moderatsiya oqimi', () => {
  it('yangi sharh PENDING holatida yaratiladi (avtomatik APPROVED emas)', async () => {
    const user = await makeUser()
    const inst = await makeInstitution()
    const review = await createReview(testPrisma, user.id, { institutionId: inst.id, overallRating: 5, body: 'Ajoyib markaz', isAnonymous: false })
    expect(review.status).toBe('PENDING')
  })

  it('bitta foydalanuvchi bitta muassasaga ikkinchi marta sharh qoldira olmaydi', async () => {
    const user = await makeUser()
    const inst = await makeInstitution()
    await createReview(testPrisma, user.id, { institutionId: inst.id, overallRating: 5, body: 'Birinchi sharh', isAnonymous: false })

    await expect(
      createReview(testPrisma, user.id, { institutionId: inst.id, overallRating: 4, body: 'Ikkinchi sharh', isAnonymous: false }),
    ).rejects.toMatchObject({ statusCode: 409 })
  })

  it('PENDING/SUSPENDED muassasaga sharh qoldirib bo\'lmaydi', async () => {
    const user = await makeUser()
    const inst = await makeInstitution({ status: 'PENDING' })

    await expect(
      createReview(testPrisma, user.id, { institutionId: inst.id, overallRating: 5, body: 'Sharh', isAnonymous: false }),
    ).rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('voteReview — faqat APPROVED sharhga ovoz berish mumkin', () => {
  it('PENDING sharhga ovoz berishga urinish rad etiladi', async () => {
    const author = await makeUser()
    const voter = await makeUser()
    const inst = await makeInstitution()
    const review = await createReview(testPrisma, author.id, { institutionId: inst.id, overallRating: 5, body: 'Sharh', isAnonymous: false })

    await expect(
      voteReview(testPrisma, review.id, voter.id, { isHelpful: true }),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('APPROVED sharhga ovoz berish mumkin, lekin o\'z sharhiga emas', async () => {
    const author = await makeUser()
    const voter = await makeUser()
    const inst = await makeInstitution()
    const review = await createReview(testPrisma, author.id, { institutionId: inst.id, overallRating: 5, body: 'Sharh', isAnonymous: false })
    await approveReview(testPrisma, review.id)

    await expect(
      voteReview(testPrisma, review.id, author.id, { isHelpful: true }),
    ).rejects.toMatchObject({ statusCode: 400 })

    await expect(
      voteReview(testPrisma, review.id, voter.id, { isHelpful: true }),
    ).resolves.toBeTruthy()
  })
})

describe('approveReview / rejectReview', () => {
  it('tasdiqlash institution.avgRating ni yangilaydi', async () => {
    const author = await makeUser()
    const inst = await makeInstitution()
    const review = await createReview(testPrisma, author.id, { institutionId: inst.id, overallRating: 4, body: 'Sharh', isAnonymous: false })

    await approveReview(testPrisma, review.id)

    const updated = await testPrisma.institution.findUnique({ where: { id: inst.id } })
    expect(updated?.avgRating).toBe(4)
    expect(updated?.reviewCount).toBe(1)
  })

  it('allaqachon APPROVED sharhni qayta tasdiqlab bo\'lmaydi', async () => {
    const author = await makeUser()
    const inst = await makeInstitution()
    const review = await createReview(testPrisma, author.id, { institutionId: inst.id, overallRating: 5, body: 'Sharh', isAnonymous: false })
    await approveReview(testPrisma, review.id)

    await expect(approveReview(testPrisma, review.id)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('rejectReview sabab bilan REJECTED holatiga o\'tkazadi', async () => {
    const author = await makeUser()
    const inst = await makeInstitution()
    const review = await createReview(testPrisma, author.id, { institutionId: inst.id, overallRating: 5, body: 'Sharh', isAnonymous: false })

    await rejectReview(testPrisma, review.id, "Spam bo'lishi mumkin")

    const updated = await testPrisma.review.findUnique({ where: { id: review.id } })
    expect(updated?.status).toBe('REJECTED')
  })
})
