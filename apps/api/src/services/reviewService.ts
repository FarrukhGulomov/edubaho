import { PrismaClient, ReviewStatus } from '@prisma/client'
import type {
  CreateReviewInput,
  UpdateReviewInput,
  ListReviewsQuery,
  VoteReviewInput,
  ReplyReviewInput,
  DashboardReviewsQuery,
} from '../schemas/reviews'

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const reviewSelect = {
  id: true,
  status: true,
  overallRating: true,
  teacherRating: true,
  facilityRating: true,
  valueRating: true,
  atmosphereRating: true,
  serviceRating: true,
  title: true,
  body: true,
  isAnonymous: true,
  isVerified: true,
  helpfulCount: true,
  replyCount: true,
  photos: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      avatarUrl: true,
    },
  },
  replies: {
    select: {
      id: true,
      body: true,
      fromInstitution: true,
      authorId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
} as const

// sortBy → Prisma orderBy
function buildOrderBy(sortBy: ListReviewsQuery['sortBy']) {
  switch (sortBy) {
    case 'oldest':
      return { createdAt: 'asc' as const }
    case 'highest':
      return { overallRating: 'desc' as const }
    case 'lowest':
      return { overallRating: 'asc' as const }
    case 'helpful':
      return { helpfulCount: 'desc' as const }
    default:
      return { createdAt: 'desc' as const }
  }
}

// ─────────────────────────────────────────────────────────────
// avgRating denormalizatsiya
// Har safar review APPROVED/REJECTED bo'lganda chaqiriladi
// ─────────────────────────────────────────────────────────────

export async function updateInstitutionRating(
  prisma: PrismaClient,
  institutionId: string,
): Promise<void> {
  const result = await prisma.review.aggregate({
    where: { institutionId, status: ReviewStatus.APPROVED },
    _avg: { overallRating: true },
    _count: { id: true },
  })

  await prisma.institution.update({
    where: { id: institutionId },
    data: {
      avgRating: result._avg.overallRating,
      reviewCount: result._count.id,
    },
  })
}

// ─────────────────────────────────────────────────────────────
// LIST  — GET /reviews/:institutionId
// ─────────────────────────────────────────────────────────────

export async function listReviews(
  prisma: PrismaClient,
  institutionId: string,
  query: ListReviewsQuery,
  requestUserId?: string,
) {
  const { page, limit, sortBy } = query
  const skip = (page - 1) * limit

  const where = {
    institutionId,
    status: ReviewStatus.APPROVED,
  }

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      select: reviewSelect,
      orderBy: buildOrderBy(sortBy),
      skip,
      take: limit,
    }),
    prisma.review.count({ where }),
  ])

  // Anonymous sharhlar uchun foydalanuvchi ma'lumotlarini yashirish
  const sanitized = reviews.map((r) => ({
    ...r,
    user: r.isAnonymous ? null : r.user,
    isOwn: requestUserId ? r.user?.id === requestUserId : false,
  }))

  return {
    data: sanitized,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  }
}

// ─────────────────────────────────────────────────────────────
// CREATE  — POST /reviews
// Sharh PENDING holatida yaratiladi, admin tasdiqlagach APPROVED
// ─────────────────────────────────────────────────────────────

export async function createReview(
  prisma: PrismaClient,
  userId: string,
  data: CreateReviewInput,
) {
  const institution = await prisma.institution.findUnique({
    where: { id: data.institutionId },
    select: { id: true, status: true },
  })

  if (!institution) {
    throw { statusCode: 404, message: 'Muassasa topilmadi' }
  }

  if (!['ACTIVE', 'PREMIUM'].includes(institution.status)) {
    throw { statusCode: 400, message: 'Bu muassasaga sharh qoldirish mumkin emas' }
  }

  const existing = await prisma.review.findUnique({
    where: { institutionId_userId: { institutionId: data.institutionId, userId } },
    select: { id: true },
  })

  if (existing) {
    throw { statusCode: 409, message: 'Siz bu muassasaga allaqachon sharh qoldirgansiz' }
  }

  const review = await prisma.review.create({
    data: {
      institutionId: data.institutionId,
      userId,
      status: ReviewStatus.PENDING,
      overallRating: data.overallRating,
      teacherRating: data.teacherRating ?? null,
      facilityRating: data.facilityRating ?? null,
      valueRating: data.valueRating ?? null,
      atmosphereRating: data.atmosphereRating ?? null,
      serviceRating: data.serviceRating ?? null,
      title: data.title ?? null,
      body: data.body,
      isAnonymous: data.isAnonymous ?? false,
    },
    select: reviewSelect,
  })

  return review
}

// ─────────────────────────────────────────────────────────────
// UPDATE  — PUT /reviews/:id
// Faqat o'z sharhi, faqat PENDING yoki REJECTED holatda
// ─────────────────────────────────────────────────────────────

export async function updateReview(
  prisma: PrismaClient,
  reviewId: string,
  userId: string,
  data: UpdateReviewInput,
) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, userId: true, status: true, institutionId: true },
  })

  if (!review) {
    throw { statusCode: 404, message: 'Sharh topilmadi' }
  }

  if (review.userId !== userId) {
    throw { statusCode: 403, message: "Bu sharhni tahrirlash huquqingiz yo'q" }
  }

  if (review.status === ReviewStatus.APPROVED) {
    throw { statusCode: 400, message: 'Tasdiqlangan sharhni tahrirlash mumkin emas' }
  }

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: {
      ...data,
      status: ReviewStatus.PENDING,
    },
    select: reviewSelect,
  })

  return updated
}

// ─────────────────────────────────────────────────────────────
// DELETE  — DELETE /reviews/:id
// Faqat o'z sharhi
// ─────────────────────────────────────────────────────────────

export async function deleteReview(
  prisma: PrismaClient,
  reviewId: string,
  userId: string,
) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, userId: true, institutionId: true, status: true },
  })

  if (!review) {
    throw { statusCode: 404, message: 'Sharh topilmadi' }
  }

  if (review.userId !== userId) {
    throw { statusCode: 403, message: "Bu sharhni o'chirish huquqingiz yo'q" }
  }

  await prisma.review.delete({ where: { id: reviewId } })

  if (review.status === ReviewStatus.APPROVED) {
    await updateInstitutionRating(prisma, review.institutionId)
  }
}

// ─────────────────────────────────────────────────────────────
// VOTE  — POST /reviews/:id/vote
// Toggle: bir xil ovoz berilsa — olib tashlanadi
// ─────────────────────────────────────────────────────────────

export async function voteReview(
  prisma: PrismaClient,
  reviewId: string,
  userId: string,
  data: VoteReviewInput,
) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, status: true, userId: true },
  })

  if (!review) {
    throw { statusCode: 404, message: 'Sharh topilmadi' }
  }

  if (review.status !== ReviewStatus.APPROVED) {
    throw { statusCode: 400, message: 'Bu sharhga ovoz berish mumkin emas' }
  }

  if (review.userId === userId) {
    throw { statusCode: 400, message: "O'z sharhingizga ovoz bera olmaysiz" }
  }

  const existing = await prisma.reviewVote.findUnique({
    where: { reviewId_userId: { reviewId, userId } },
  })

  if (existing) {
    if (existing.isHelpful === data.isHelpful) {
      await prisma.reviewVote.delete({
        where: { reviewId_userId: { reviewId, userId } },
      })
    } else {
      await prisma.reviewVote.update({
        where: { reviewId_userId: { reviewId, userId } },
        data: { isHelpful: data.isHelpful },
      })
    }
  } else {
    await prisma.reviewVote.create({
      data: { reviewId, userId, isHelpful: data.isHelpful },
    })
  }

  const helpfulCount = await prisma.reviewVote.count({
    where: { reviewId, isHelpful: true },
  })

  await prisma.review.update({
    where: { id: reviewId },
    data: { helpfulCount },
  })

  return { helpfulCount }
}

// ─────────────────────────────────────────────────────────────
// REPLY  — POST /reviews/:id/reply
// fromInstitution flag bilan universal (user va muassasa uchun)
// ─────────────────────────────────────────────────────────────

export async function replyToReview(
  prisma: PrismaClient,
  reviewId: string,
  userId: string,
  data: ReplyReviewInput,
  fromInstitution = false,
) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, status: true },
  })

  if (!review) {
    throw { statusCode: 404, message: 'Sharh topilmadi' }
  }

  if (review.status !== ReviewStatus.APPROVED) {
    throw { statusCode: 400, message: 'Bu sharhga javob berish mumkin emas' }
  }

  const [reply] = await prisma.$transaction([
    prisma.reviewReply.create({
      data: { reviewId, authorId: userId, body: data.body, fromInstitution },
    }),
    prisma.review.update({
      where: { id: reviewId },
      data: { replyCount: { increment: 1 } },
    }),
  ])

  return reply
}

// ─────────────────────────────────────────────────────────────
// REPORT  — POST /reviews/:id/report
// FLAGGED holatga o'tkaziladi, admin ko'rib chiqadi
// ─────────────────────────────────────────────────────────────

export async function reportReview(
  prisma: PrismaClient,
  reviewId: string,
  userId: string,
  reason: string,
  note?: string,
) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, status: true, userId: true },
  })

  if (!review) {
    throw { statusCode: 404, message: 'Sharh topilmadi' }
  }

  if (review.status !== ReviewStatus.APPROVED) {
    throw { statusCode: 400, message: 'Bu sharhni shikoyat qilish mumkin emas' }
  }

  if (review.userId === userId) {
    throw { statusCode: 400, message: "O'z sharhingizni shikoyat qila olmaysiz" }
  }

  await prisma.review.update({
    where: { id: reviewId },
    data: { status: ReviewStatus.FLAGGED },
  })

  // Notification (fire-and-forget)
  void prisma.notification.create({
    data: {
      userId,
      type: 'review_flagged',
      title: 'Sharh shikoyat qilindi',
      body: `Sabab: ${reason}${note ? `. Izoh: ${note}` : ''}`,
      data: { reviewId, reason, note },
    },
  })

  return { success: true }
}

// ─────────────────────────────────────────────────────────────
// ADMIN: LIST PENDING  — GET /admin/reviews/pending
// ─────────────────────────────────────────────────────────────

export async function listPendingReviews(
  prisma: PrismaClient,
  page = 1,
  limit = 20,
  status: ReviewStatus = ReviewStatus.PENDING,
) {
  const skip = (page - 1) * limit
  const where = { status }

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      select: {
        ...reviewSelect,
        institutionId: true,
        institution: { select: { id: true, nameUz: true, slug: true } },
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
    }),
    prisma.review.count({ where }),
  ])

  return {
    data: reviews,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  }
}

// ─────────────────────────────────────────────────────────────
// ADMIN: APPROVE  — PATCH /admin/reviews/:id/approve
// ─────────────────────────────────────────────────────────────

export async function approveReview(prisma: PrismaClient, reviewId: string) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, status: true, institutionId: true, userId: true },
  })

  if (!review) {
    throw { statusCode: 404, message: 'Sharh topilmadi' }
  }

  if (review.status === ReviewStatus.APPROVED) {
    throw { statusCode: 400, message: 'Sharh allaqachon tasdiqlangan' }
  }

  await prisma.review.update({
    where: { id: reviewId },
    data: { status: ReviewStatus.APPROVED },
  })

  await updateInstitutionRating(prisma, review.institutionId)

  await prisma.notification.create({
    data: {
      userId: review.userId,
      type: 'review_approved',
      title: 'Sharhingiz tasdiqlandi',
      body: "Sizning sharhingiz moderatsiyadan o'tdi va e'lon qilindi.",
      data: { reviewId },
    },
  })

  return { success: true }
}

// ─────────────────────────────────────────────────────────────
// ADMIN: REJECT  — PATCH /admin/reviews/:id/reject
// ─────────────────────────────────────────────────────────────

export async function rejectReview(
  prisma: PrismaClient,
  reviewId: string,
  reason?: string,
) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, status: true, institutionId: true, userId: true },
  })

  if (!review) {
    throw { statusCode: 404, message: 'Sharh topilmadi' }
  }

  if (review.status === ReviewStatus.REJECTED) {
    throw { statusCode: 400, message: 'Sharh allaqachon rad etilgan' }
  }

  const wasApproved = review.status === ReviewStatus.APPROVED

  await prisma.review.update({
    where: { id: reviewId },
    data: { status: ReviewStatus.REJECTED },
  })

  if (wasApproved) {
    await updateInstitutionRating(prisma, review.institutionId)
  }

  await prisma.notification.create({
    data: {
      userId: review.userId,
      type: 'review_rejected',
      title: 'Sharhingiz rad etildi',
      body: reason ?? "Sharhingiz qoidalarga muvofiq emas deb topildi.",
      data: { reviewId, reason },
    },
  })

  return { success: true }
}

// ─────────────────────────────────────────────────────────────
// DASHBOARD: LIST  — GET /dashboard/reviews
// Muassasa egasi o'z muassasasiga kelgan barcha sharhlarni ko'radi
// ─────────────────────────────────────────────────────────────

export async function listInstitutionReviews(
  prisma: PrismaClient,
  institutionId: string,
  query: DashboardReviewsQuery,
) {
  const { page, limit, status } = query
  const skip = (page - 1) * limit

  const where = {
    institutionId,
    ...(status ? { status: status as ReviewStatus } : {}),
  }

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      select: { ...reviewSelect, userId: true, status: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.review.count({ where }),
  ])

  return {
    data: reviews,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  }
}
