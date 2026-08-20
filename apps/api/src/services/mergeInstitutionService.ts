import type { PrismaClient } from '@prisma/client'
import { updateInstitutionRating } from './reviewService'
import { indexInstitution, removeFromIndex } from './searchService'

/**
 * Ikkita "duplicate" Institution yozuvini bittaga birlashtiradi — masalan
 * "PDP Academy" Buxoro va Toshkent uchun ALOHIDA Institution sifatida
 * qo'shilgan bo'lsa, buni bitta "PDP Academy" (primary) ostidagi
 * InstitutionBranch'ga aylantiradi.
 *
 * `duplicateId` — birlashtiriladigan (keyin O'CHIRILADIGAN) yozuv,
 * `primaryId` — saqlanib qoladigan asosiy yozuv (nomi, tavsifi, narxi,
 * ta'lim profili shu yozuvnikidan qoladi — duplicate'niki tashlab
 * yuboriladi, faqat manzili filial sifatida saqlanadi).
 *
 * Review/SavedInstitution kabi UNIQUE(institutionId, userId) cheklovli
 * jadvallarda — agar bitta user ikkalasini ham baholagan/saqlagan bo'lsa,
 * duplicate'dagi yozuv o'chiriladi (primary'dagi ustuvor hisoblanadi),
 * qolganlari primary'ga ko'chiriladi.
 */
export async function mergeInstitutions(
  prisma: PrismaClient,
  primaryId: string,
  duplicateId: string,
) {
  if (primaryId === duplicateId) {
    throw new Error("Bir xil muassasani o'ziga birlashtirib bo'lmaydi")
  }

  const [primary, duplicate] = await Promise.all([
    prisma.institution.findUnique({ where: { id: primaryId } }),
    prisma.institution.findUnique({ where: { id: duplicateId } }),
  ])
  if (!primary) throw new Error('Asosiy muassasa topilmadi')
  if (!duplicate) throw new Error('Birlashtiriladigan muassasa topilmadi')

  // Review: (institutionId, userId) unique — ziddiyatli (ikkalasiga ham
  // sharh qoldirgan) foydalanuvchilarning duplicate'dagi sharhi o'chiriladi
  const [primaryReviewUsers, duplicateReviews] = await Promise.all([
    prisma.review.findMany({ where: { institutionId: primaryId }, select: { userId: true } }),
    prisma.review.findMany({ where: { institutionId: duplicateId }, select: { id: true, userId: true } }),
  ])
  const primaryReviewUserIds = new Set(primaryReviewUsers.map((r) => r.userId))
  const conflictingReviewIds = duplicateReviews
    .filter((r) => primaryReviewUserIds.has(r.userId))
    .map((r) => r.id)

  // SavedInstitution: (userId, institutionId) unique — xuddi shunday
  const [primarySavedUsers, duplicateSaved] = await Promise.all([
    prisma.savedInstitution.findMany({ where: { institutionId: primaryId }, select: { userId: true } }),
    prisma.savedInstitution.findMany({ where: { institutionId: duplicateId }, select: { id: true, userId: true } }),
  ])
  const primarySavedUserIds = new Set(primarySavedUsers.map((s) => s.userId))
  const conflictingSavedIds = duplicateSaved
    .filter((s) => primarySavedUserIds.has(s.userId))
    .map((s) => s.id)

  const movedCounts = {
    reviews: duplicateReviews.length - conflictingReviewIds.length,
    saved: duplicateSaved.length - conflictingSavedIds.length,
  }

  await prisma.$transaction([
    // Ziddiyatli yozuvlarni o'chirish (primary'dagi ustuvor)
    ...(conflictingReviewIds.length > 0
      ? [prisma.review.deleteMany({ where: { id: { in: conflictingReviewIds } } })]
      : []),
    ...(conflictingSavedIds.length > 0
      ? [prisma.savedInstitution.deleteMany({ where: { id: { in: conflictingSavedIds } } })]
      : []),

    // Qolganlarini primary'ga ko'chirish
    prisma.review.updateMany({ where: { institutionId: duplicateId }, data: { institutionId: primaryId } }),
    prisma.savedInstitution.updateMany({ where: { institutionId: duplicateId }, data: { institutionId: primaryId } }),
    prisma.institutionClaim.updateMany({ where: { institutionId: duplicateId }, data: { institutionId: primaryId } }),
    prisma.analyticsEvent.updateMany({ where: { institutionId: duplicateId }, data: { institutionId: primaryId } }),
    prisma.leadEvent.updateMany({ where: { institutionId: duplicateId }, data: { institutionId: primaryId } }),
    prisma.trialBooking.updateMany({ where: { institutionId: duplicateId }, data: { institutionId: primaryId } }),
    // Agar duplicate'ning o'zi allaqachon filiallarga ega bo'lsa (masalan
    // ilgari boshqa yozuv shu duplicate'ga birlashtirilgan bo'lsa) — ular
    // ham primary'ga qayta bog'lanadi, aks holda duplicate o'chirilganda
    // yo'qolib ketardi
    prisma.institutionBranch.updateMany({ where: { institutionId: duplicateId }, data: { institutionId: primaryId } }),

    // Duplicate'ning 1:1 obuna yozuvi bor bo'lsa — saqlashning ma'nosi yo'q
    // (primary o'z obunasini saqlaydi), avval to'lovlarini, keyin o'zini o'chiramiz
    prisma.subscriptionPayment.deleteMany({ where: { subscription: { institutionId: duplicateId } } }),
    prisma.subscription.deleteMany({ where: { institutionId: duplicateId } }),
  ])

  // Duplicate'ning joylashuvini primary ostida FILIAL sifatida saqlab qolamiz
  // (agar shahar ko'rsatilgan bo'lsa — InstitutionBranch uchun majburiy)
  if (duplicate.cityId && duplicate.regionId) {
    await prisma.institutionBranch.create({
      data: {
        institutionId: primaryId,
        nameUz: duplicate.nameUz !== primary.nameUz ? duplicate.nameUz : undefined,
        nameRu: duplicate.nameRu && duplicate.nameRu !== primary.nameRu ? duplicate.nameRu : undefined,
        cityId: duplicate.cityId,
        regionId: duplicate.regionId,
        address: duplicate.address ?? undefined,
        lat: duplicate.lat ?? undefined,
        lng: duplicate.lng ?? undefined,
        phone: duplicate.phone ?? undefined,
      },
    })
  }

  // InstitutionDetail/Pricing/Media/Feature/Accreditation — schema'da
  // onDelete: Cascade, Institution o'chirilganda duplicate'nikilar
  // avtomatik o'chadi (primary'nikilar SAQLANIB qoladi, ustiga yozilmaydi)
  await prisma.institution.delete({ where: { id: duplicateId } })

  await updateInstitutionRating(prisma, primaryId)

  const refreshedPrimary = await prisma.institution.findUnique({
    where: { id: primaryId },
    include: {
      city:    { select: { nameUz: true } },
      details: { select: { descriptionUz: true, descriptionRu: true, programs: true, specializations: true } },
      pricing: { select: { monthlyMin: true } },
    },
  })
  removeFromIndex(duplicateId).catch(() => {})
  if (refreshedPrimary && ['ACTIVE', 'PREMIUM'].includes(refreshedPrimary.status)) {
    indexInstitution(refreshedPrimary).catch(() => {})
  }

  return { movedCounts, branchCreated: !!(duplicate.cityId && duplicate.regionId) }
}
