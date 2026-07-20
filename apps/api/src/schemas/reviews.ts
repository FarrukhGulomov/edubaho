import { z } from 'zod'

// ─────────────────────────────────────────────
// Primitives
// ─────────────────────────────────────────────

const ratingField = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
])

// ─────────────────────────────────────────────
// Review CRUD
// ─────────────────────────────────────────────

export const createReviewSchema = z.object({
  institutionId: z.string().min(1, "Muassasa ID kiritilishi shart"),
  overallRating: ratingField,
  teacherRating: ratingField.optional(),
  facilityRating: ratingField.optional(),
  valueRating: ratingField.optional(),
  atmosphereRating: ratingField.optional(),
  serviceRating: ratingField.optional(),
  title: z.string().max(100, "Sarlavha 100 ta belgidan oshmasligi kerak").optional(),
  body: z
    .string()
    .min(2, "Sharh kamida 2 ta belgi bo'lishi kerak")
    .max(2000, "Sharh 2000 ta belgidan oshmasligi kerak"),
  isAnonymous: z.boolean().optional().default(false),
  // UTP#1: ixtiyoriy natija ("IELTS 7.0 oldim") — admin tasdiqlasa badge bilan ko'rsatiladi
  outcomeText: z.string().max(150, "Natija matni 150 ta belgidan oshmasligi kerak").optional(),
})

export const updateReviewSchema = z.object({
  overallRating: ratingField.optional(),
  teacherRating: ratingField.optional(),
  facilityRating: ratingField.optional(),
  valueRating: ratingField.optional(),
  atmosphereRating: ratingField.optional(),
  serviceRating: ratingField.optional(),
  title: z.string().max(100, "Sarlavha 100 ta belgidan oshmasligi kerak").optional(),
  body: z
    .string()
    .min(50, "Sharh kamida 50 ta belgi bo'lishi kerak")
    .max(2000, "Sharh 2000 ta belgidan oshmasligi kerak")
    .optional(),
  isAnonymous: z.boolean().optional(),
  outcomeText: z.string().max(150, "Natija matni 150 ta belgidan oshmasligi kerak").optional(),
})

// ─────────────────────────────────────────────
// Query params
// ─────────────────────────────────────────────

export const listReviewsQuerySchema = z.object({
  sortBy: z
    .enum(['newest', 'oldest', 'highest', 'lowest', 'helpful'])
    .optional()
    .default('newest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
})

// ─────────────────────────────────────────────
// Vote / Reply / Report
// ─────────────────────────────────────────────

export const voteReviewSchema = z.object({
  isHelpful: z.boolean(),
})

export const replyReviewSchema = z.object({
  body: z
    .string()
    .min(10, "Javob kamida 10 ta belgi bo'lishi kerak")
    .max(1000, "Javob 1000 ta belgidan oshmasligi kerak"),
})

export const reportReviewSchema = z.object({
  reason: z.enum(['spam', 'offensive', 'fake', 'irrelevant', 'other'], {
    errorMap: () => ({ message: "Noto'g'ri shikoyat sababi" }),
  }),
  note: z.string().max(500).optional(),
})

// ─────────────────────────────────────────────
// Admin moderation
// ─────────────────────────────────────────────

export const moderateReviewSchema = z.object({
  reason: z.string().max(500).optional(),
})

// ─────────────────────────────────────────────
// Dashboard query (B2B)
// ─────────────────────────────────────────────

export const dashboardReviewsQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'FLAGGED']).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
})

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type CreateReviewInput = z.infer<typeof createReviewSchema>
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>
export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>
export type VoteReviewInput = z.infer<typeof voteReviewSchema>
export type ReplyReviewInput = z.infer<typeof replyReviewSchema>
export type ReportReviewInput = z.infer<typeof reportReviewSchema>
export type ModerateReviewInput = z.infer<typeof moderateReviewSchema>
export type DashboardReviewsQuery = z.infer<typeof dashboardReviewsQuerySchema>
