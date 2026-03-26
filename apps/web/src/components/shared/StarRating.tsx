interface StarRatingProps {
  rating: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
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
