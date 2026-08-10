/**
 * BilimOn belgisi (ikonka, "bilim" so'zidagi "o" o'rnini bosuvchi belgi) —
 * kichik joylarda (breadcrumb, badge) to'liq logotip o'rniga ishlatiladi.
 */

interface BrandMarkProps {
  size?: number
  className?: string
}

export default function BrandMark({ size = 16, className }: BrandMarkProps) {
  return (
    <svg viewBox="14 4 68 80" style={{ height: size, width: size }} className={className} aria-hidden="true">
      <circle
        cx="48" cy="54" r="26"
        stroke="currentColor" strokeWidth="9" fill="none" strokeLinecap="round"
        strokeDasharray="130 33" transform="rotate(-54 48 54)"
      />
      <path d="M48 8 74 20 48 32 22 20Z" fill="currentColor" />
      <path d="M68 23v12" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <circle cx="68" cy="38" r="3.4" fill="currentColor" opacity="0.5" />
    </svg>
  )
}
