import { Star } from 'lucide-react'

interface StarRatingProps {
  rating: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
}

/**
 * RatingHint — reytingning TINCH, e'tibor tortmaydigan ko'rinishi.
 * Baholar foydalanuvchilar tomonidan qo'yilgani uchun taxminiy ko'rsatkich —
 * asosiy parametr sifatida bo'rttirib ko'rsatilmaydi (ro'yxat kartalari,
 * hero va shu kabi joylarda aynan shu ishlatiladi; katta yulduzli StarRating
 * faqat sharhlar kontekstida qoladi).
 */
export function RatingHint({ rating, count, lang = 'uz' }: { rating: number; count?: number; lang?: 'uz' | 'ru' }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs text-gray-400"
      title={lang === 'ru'
        ? 'Оценка пользователей — приблизительный показатель'
        : "Foydalanuvchilar bahosi — taxminiy ko'rsatkich"}
    >
      <Star className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
      {rating.toFixed(1)}
      {count != null && <span>({count})</span>}
    </span>
  )
}

export default function StarRating({ rating, max = 5, size = 'md', showValue = true }: StarRatingProps) {
  const sizes = { sm: 'text-sm', md: 'text-base', lg: 'text-lg' }

  return (
    <span className={`flex items-center gap-1 ${sizes[size]}`}>
      <span className="text-yellow-400">
        {'★'.repeat(Math.round(rating))}
        {'☆'.repeat(max - Math.round(rating))}
      </span>
      {showValue && (
        <span className="font-semibold text-gray-800">{rating.toFixed(1)}</span>
      )}
    </span>
  )
}
