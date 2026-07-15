import { Star } from 'lucide-react'

interface StarRatingProps {
  rating: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
}

/**
 * Yulduzli reyting — SVG yulduzlar, qisman to'ldirish bilan.
 * Unicode ★ o'rniga vektor — barcha qurilmalarda aniq ko'rinadi.
 */
export default function StarRating({ rating, max = 5, size = 'md', showValue = true }: StarRatingProps) {
  const px = { sm: 14, md: 16, lg: 20 }[size]
  const textCls = { sm: 'text-sm', md: 'text-base', lg: 'text-lg' }[size]

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${textCls}`}
      role="img"
      aria-label={`${rating.toFixed(1)} / ${max}`}
    >
      <span className="flex items-center gap-0.5">
        {Array.from({ length: max }).map((_, i) => {
          // Har bir yulduz uchun to'ldirish darajasi (0–1)
          const fill = Math.max(0, Math.min(1, rating - i))
          return (
            <span key={i} className="relative inline-flex" style={{ width: px, height: px }}>
              <Star
                className="absolute inset-0 text-line-2"
                style={{ width: px, height: px }}
                fill="currentColor"
                strokeWidth={0}
                aria-hidden
              />
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
                aria-hidden
              >
                <Star
                  className="text-amber-400"
                  style={{ width: px, height: px }}
                  fill="currentColor"
                  strokeWidth={0}
                />
              </span>
            </span>
          )
        })}
      </span>
      {showValue && (
        <span className="font-semibold tabular-nums text-ink">{rating.toFixed(1)}</span>
      )}
    </span>
  )
}
