/**
 * EDUBAHO brend logotipi — kod orqali yasalgan SVG component.
 * Rasm fayli kerak emas, har qanday o'lchamda aniq ko'rinadi.
 */

interface LogoProps {
  /** Logo balandligi (px). Default: 40 */
  size?: number
  /** Qora fon uchun — matn ranglarini oqqa o'zgartiradi */
  inverted?: boolean
}

export default function Logo({ size = 40, inverted = false }: LogoProps) {
  // Proporsional hisoblash
  const h = size
  const fontSize = h * 0.62
  const iconSize = h * 0.72

  return (
    <span className="inline-flex items-center select-none" style={{ height: h }}>
      {/* ── "EDU" — yashil ── */}
      <span
        style={{
          fontSize,
          fontWeight: 900,
          lineHeight: 1,
          color: inverted ? '#4ade80' : '#16a34a',
          letterSpacing: '-0.02em',
          fontFamily: 'inherit',
        }}
      >
        EDU
      </span>

      {/* ── "BAH" — ko'k ── */}
      <span
        style={{
          fontSize,
          fontWeight: 900,
          lineHeight: 1,
          color: inverted ? '#93c5fd' : '#1d4ed8',
          letterSpacing: '-0.02em',
          fontFamily: 'inherit',
        }}
      >
        BAH
      </span>

      {/* ── "O" — ko'k doira + sariq yulduz ── */}
      <span
        className="relative inline-flex items-center justify-center"
        style={{ width: fontSize * 0.72, height: fontSize * 0.72, marginLeft: 1 }}
      >
        {/* Ko'k doira */}
        <span
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: inverted ? '#93c5fd' : '#1d4ed8',
          }}
        />
        {/* Sariq yulduz */}
        <svg
          viewBox="0 0 24 24"
          fill="#FBBF24"
          style={{ position: 'relative', zIndex: 1, width: '60%', height: '60%' }}
        >
          <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.3L12 17l-6.2 4.2 2.4-7.3L2 9.4h7.6z" />
        </svg>
      </span>

      {/* ── Icon: bar chart + checkmark ── */}
      <svg
        viewBox="0 0 40 36"
        fill="none"
        style={{ width: iconSize, height: iconSize, marginLeft: size * 0.12 }}
      >
        {/* Bar chart — 3 ta ustun */}
        <rect x="1"  y="18" width="9" height="17" rx="2"
          fill={inverted ? '#93c5fd' : '#1d4ed8'} />
        <rect x="15" y="10" width="9" height="25" rx="2"
          fill={inverted ? '#93c5fd' : '#1d4ed8'} />
        <rect x="29" y="2"  width="9" height="33" rx="2"
          fill={inverted ? '#93c5fd' : '#1d4ed8'} />

        {/* Checkmark — yashil */}
        <path
          d="M3 28 L13 36 L37 10"
          stroke={inverted ? '#4ade80' : '#16a34a'}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}
