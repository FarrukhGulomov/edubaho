interface BrandMarkProps {
  size?: number
  className?: string
  inverted?: boolean
}

export default function BrandMark({ size = 16, className, inverted = false }: BrandMarkProps) {
  const markSrc = inverted ? '/brand/bilimon-mark-white.svg' : '/brand/bilimon-mark.svg'

  return (
    <img
      src={markSrc}
      alt="BilimOn"
      style={{ height: size, width: size, display: 'inline-block' }}
      className={className}
      aria-hidden="true"
    />
  )
}
