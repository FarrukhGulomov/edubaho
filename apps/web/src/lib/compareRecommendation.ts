/**
 * Solishtirish uchun tavsiya va farqlarni avtomatik aniqlash.
 *
 * Hech narsa qattiq kodlanmagan (hardcode) — barcha xulosalar
 * berilgan muassasalarning haqiqiy maydonlaridan (reyting, narx,
 * sharhlar, filiallar, tasdiqlanganlik) hisoblanadi. Agar
 * ma'lumot yetarli farqlanmasa, tavsiya yoki belgi ko'rsatilmaydi —
 * soxta xulosa berilmaydi.
 */

export interface CompareRecInput {
  id: string
  nameUz: string
  nameRu?: string | null
  avgRating?: number | null
  reviewCount: number
  viewCount: number
  isVerified: boolean
  createdAt: string
  pricing?: { monthlyMin?: number | null } | null
  branchCount: number
}

export type HighlightBadge =
  | 'lowest_price' | 'highest_rating' | 'most_reviews' | 'most_branches'
  | 'most_popular' | 'newest' | 'verified' | 'best_value'

export const BADGE_LABELS: Record<HighlightBadge, { uz: string; ru: string }> = {
  lowest_price:   { uz: 'Eng arzon',            ru: 'Самый дешёвый' },
  highest_rating: { uz: 'Eng yuqori reyting',   ru: 'Самый высокий рейтинг' },
  most_reviews:   { uz: "Eng ko'p sharh",       ru: 'Больше всего отзывов' },
  most_branches:  { uz: "Eng ko'p filial",      ru: 'Больше всего филиалов' },
  most_popular:   { uz: 'Eng mashhur',          ru: 'Самый популярный' },
  newest:         { uz: 'Eng yangi',            ru: 'Самый новый' },
  verified:       { uz: 'Tasdiqlangan',         ru: 'Подтверждён' },
  best_value:     { uz: 'Eng yaxshi narx-sifat', ru: 'Лучшее цена-качество' },
}

const BAYES_PRIOR = 10

function adjustedRating(item: CompareRecInput, groupAvg: number): number {
  const n = item.reviewCount
  const r = item.avgRating
  if (r == null) return groupAvg
  return (BAYES_PRIOR * groupAvg + r * n) / (BAYES_PRIOR + n)
}

function groupRatingAvg(items: CompareRecInput[]): number {
  const rated = items.filter((i) => i.avgRating != null)
  if (rated.length === 0) return 4.0
  return rated.reduce((s, i) => s + (i.avgRating ?? 0), 0) / rated.length
}

function valueScore(item: CompareRecInput, groupAvg: number): number | null {
  const price = item.pricing?.monthlyMin
  if (!price) return null
  const priceIn100k = price / 100_000
  return adjustedRating(item, groupAvg) / Math.max(priceIn100k, 0.1)
}

/** Har bir qatorda eng yaxshi qiymatga ega muassasa(lar)ga belgi qo'yadi */
export function computeHighlights(items: CompareRecInput[]): Map<string, HighlightBadge[]> {
  const result = new Map<string, HighlightBadge[]>(items.map((i) => [i.id, []]))
  if (items.length < 2) return result

  const push = (id: string, badge: HighlightBadge) => {
    result.get(id)?.push(badge)
  }

  // Eng arzon — narxi bor va bir xil bo'lmagan holatda
  const priced = items.filter((i) => i.pricing?.monthlyMin != null)
  if (priced.length >= 2) {
    const min = Math.min(...priced.map((i) => i.pricing!.monthlyMin!))
    const distinct = new Set(priced.map((i) => i.pricing!.monthlyMin!)).size > 1
    if (distinct) priced.filter((i) => i.pricing!.monthlyMin === min).forEach((i) => push(i.id, 'lowest_price'))
  }

  // Eng yuqori reyting
  const rated = items.filter((i) => i.avgRating != null)
  if (rated.length >= 2) {
    const max = Math.max(...rated.map((i) => i.avgRating!))
    const distinct = new Set(rated.map((i) => i.avgRating!)).size > 1
    if (distinct) rated.filter((i) => i.avgRating === max).forEach((i) => push(i.id, 'highest_rating'))
  }

  // Eng ko'p sharh
  const withReviews = items.filter((i) => i.reviewCount > 0)
  if (withReviews.length >= 2) {
    const max = Math.max(...withReviews.map((i) => i.reviewCount))
    const distinct = new Set(withReviews.map((i) => i.reviewCount)).size > 1
    if (distinct) withReviews.filter((i) => i.reviewCount === max).forEach((i) => push(i.id, 'most_reviews'))
  }

  // Eng ko'p filial
  const withBranches = items.filter((i) => i.branchCount > 0)
  if (withBranches.length >= 2) {
    const max = Math.max(...withBranches.map((i) => i.branchCount))
    const distinct = new Set(withBranches.map((i) => i.branchCount)).size > 1
    if (distinct) withBranches.filter((i) => i.branchCount === max).forEach((i) => push(i.id, 'most_branches'))
  }

  // Eng mashhur (ko'rishlar soni)
  const withViews = items.filter((i) => i.viewCount > 0)
  if (withViews.length >= 2) {
    const max = Math.max(...withViews.map((i) => i.viewCount))
    const distinct = new Set(withViews.map((i) => i.viewCount)).size > 1
    if (distinct) withViews.filter((i) => i.viewCount === max).forEach((i) => push(i.id, 'most_popular'))
  }

  // Eng yangi
  const dated = items.filter((i) => i.createdAt)
  if (dated.length >= 2) {
    const max = Math.max(...dated.map((i) => new Date(i.createdAt).getTime()))
    const distinct = new Set(dated.map((i) => new Date(i.createdAt).getTime())).size > 1
    if (distinct) dated.filter((i) => new Date(i.createdAt).getTime() === max).forEach((i) => push(i.id, 'newest'))
  }

  // Tasdiqlangan — hammasi bir xil bo'lmasa (hammasi tasdiqlangan bo'lsa ajratish ma'nosiz)
  const verifiedCount = items.filter((i) => i.isVerified).length
  if (verifiedCount > 0 && verifiedCount < items.length) {
    items.filter((i) => i.isVerified).forEach((i) => push(i.id, 'verified'))
  }

  // Eng yaxshi narx-sifat (UTP#5 formula bilan bir xil)
  const groupAvg = groupRatingAvg(items)
  const valued = items
    .map((i) => ({ id: i.id, score: valueScore(i, groupAvg) }))
    .filter((v): v is { id: string; score: number } => v.score != null)
  if (valued.length >= 2) {
    const max = Math.max(...valued.map((v) => v.score))
    const distinct = new Set(valued.map((v) => v.score)).size > 1
    if (distinct) valued.filter((v) => v.score === max).forEach((v) => push(v.id, 'best_value'))
  }

  return result
}

export interface Recommendation {
  winnerId: string
  reasons: { uz: string; ru: string }[]
}

/**
 * Umumiy vaznli ball asosida eng mos muassasani aniqlaydi va
 * ikkinchi o'rindagidan qanday ustunligini tushuntiradi.
 * Ma'lumot yetarli farqlanmasa — null qaytaradi (soxta tavsiya yo'q).
 */
export function computeRecommendation(items: CompareRecInput[]): Recommendation | null {
  if (items.length < 2) return null

  const groupAvg = groupRatingAvg(items)
  const prices = items.map((i) => i.pricing?.monthlyMin).filter((p): p is number => p != null)
  const minPrice = prices.length ? Math.min(...prices) : null
  const maxPrice = prices.length ? Math.max(...prices) : null
  const maxBranches = Math.max(1, ...items.map((i) => i.branchCount))
  const maxReviews = Math.max(1, ...items.map((i) => i.reviewCount))

  const scored = items.map((item) => {
    const ratingNorm = adjustedRating(item, groupAvg) / 5 // 0..1
    const priceNorm = item.pricing?.monthlyMin != null && minPrice != null && maxPrice != null && maxPrice > minPrice
      ? 1 - (item.pricing.monthlyMin - minPrice) / (maxPrice - minPrice)
      : 0.5 // narx ma'lum bo'lmasa neytral
    const reviewsNorm = item.reviewCount / maxReviews
    const branchesNorm = item.branchCount / maxBranches
    const verifiedNorm = item.isVerified ? 1 : 0

    // Og'irliklar: reyting va narx eng muhim omillar — foydalanuvchi
    // qaror qabul qilishda birinchi navbatda shularga qaraydi
    const score = ratingNorm * 0.40 + priceNorm * 0.30 + verifiedNorm * 0.15
      + reviewsNorm * 0.10 + branchesNorm * 0.05

    return { item, score, adjRating: adjustedRating(item, groupAvg) }
  })

  scored.sort((a, b) => b.score - a.score)
  const [winner, runnerUp] = scored
  if (!runnerUp) return null

  // G'olib va ikkinchisi orasida amaliy farq juda kichik bo'lsa — tavsiya
  // ma'nosiz (deyarli teng), foydalanuvchini yolg'on ishontirmaymiz
  if (winner.score - runnerUp.score < 0.03) return null

  const reasons: { uz: string; ru: string }[] = []

  if (winner.adjRating - runnerUp.adjRating > 0.15) {
    reasons.push({ uz: 'Yuqoriroq reyting', ru: 'Более высокий рейтинг' })
  }
  const wp = winner.item.pricing?.monthlyMin
  const rp = runnerUp.item.pricing?.monthlyMin
  if (wp != null && rp != null && wp < rp) {
    reasons.push({ uz: 'Pastroq oylik narx', ru: 'Более низкая ежемесячная цена' })
  }
  if (winner.item.isVerified && !runnerUp.item.isVerified) {
    reasons.push({ uz: 'Tasdiqlangan muassasa', ru: 'Подтверждённое учреждение' })
  }
  if (winner.item.reviewCount > runnerUp.item.reviewCount * 1.5 && winner.item.reviewCount >= 3) {
    reasons.push({ uz: "Ko'proq sharh — ishonchliroq", ru: 'Больше отзывов — надёжнее' })
  }
  if (winner.item.branchCount > runnerUp.item.branchCount) {
    reasons.push({ uz: "Ko'proq filial — qulayroq joylashuv", ru: 'Больше филиалов — удобнее расположение' })
  }

  // Aniq sabab topilmasa — umumiy ball farqiga tayanib tavsiya bermaymiz
  if (reasons.length === 0) return null

  return { winnerId: winner.item.id, reasons }
}
