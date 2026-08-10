/**
 * BilimOn brend logotipi — kod orqali yasalgan SVG component.
 * Rasm fayli kerak emas, har qanday o'lchamda aniq ko'rinadi.
 * "bilim" so'zidagi "o" harfi o'rniga bitiruv qalpog'i + progress
 * halqasi belgisi (asl dizayn: public/brand/bilimon-wordmark.svg).
 */

interface LogoProps {
  /** Logo balandligi (px). Default: 40 */
  size?: number
  /** Qora fon uchun — matn/belgi ranglarini oqqa o'zgartiradi */
  inverted?: boolean
}

const NAVY = '#0c4a6e'
const SKY = '#0ea5e9'
const SKY_DOT = '#0284c7'

export default function Logo({ size = 40, inverted = false }: LogoProps) {
  const textColor = inverted ? '#ffffff' : NAVY
  const ringColor = inverted ? '#ffffff' : SKY
  const capColor = inverted ? '#ffffff' : NAVY
  const dotColor = inverted ? '#bae6fd' : SKY_DOT

  // Asl SVG viewBox 340x84 — nisbatni saqlab, berilgan balandlikka moslaymiz
  const width = size * (340 / 84)

  return (
    <svg
      viewBox="0 0 340 84"
      style={{ height: size, width, display: 'block' }}
      aria-label="BilimOn"
    >
      <text x="0" y="66" fontSize="60" fontWeight="800" letterSpacing="-1.2" fill={textColor} fontFamily="var(--font-inter), Inter, system-ui, sans-serif">
        bilim
      </text>
      <g transform="translate(160 12) scale(0.72)">
        <circle
          cx="48" cy="54" r="26"
          stroke={ringColor} strokeWidth="9" fill="none" strokeLinecap="round"
          strokeDasharray="130 33" transform="rotate(-54 48 54)"
        />
        <path d="M48 8 74 20 48 32 22 20Z" fill={capColor} />
        <path d="M68 23v12" stroke={capColor} strokeWidth="4" strokeLinecap="round" />
        <circle cx="68" cy="38" r="3.4" fill={dotColor} />
      </g>
      <text x="228" y="66" fontSize="60" fontWeight="800" letterSpacing="-1.2" fill={textColor} fontFamily="var(--font-inter), Inter, system-ui, sans-serif">
        n
      </text>
    </svg>
  )
}
