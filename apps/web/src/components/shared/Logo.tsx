/**
 * EDUBAHO brend logotipi — kod orqali yasalgan SVG component.
 * Rasm fayli kerak emas, har qanday o'lchamda aniq ko'rinadi.
 * Dark mode'da ranglar avtomatik ochroq tusga o'tadi.
 */

interface LogoProps {
  /** Logo balandligi (px). Default: 40 */
  size?: number
  /** Doim qora fon ustida turadigan joylar uchun (masalan, footer) */
  inverted?: boolean
}

export default function Logo({ size = 40, inverted = false }: LogoProps) {
  const h = size
  const fontSize = h * 0.62
  const iconSize = h * 0.72

  // "inverted" — doim ochiq ranglar; aks holda mavzuga qarab almashadi
  const greenCls = inverted ? 'text-green-400' : 'text-green-600 dark:text-green-400'
  const blueCls  = inverted ? 'text-blue-300'  : 'text-blue-700 dark:text-blue-300'

  return (
    <span className="inline-flex items-center select-none" style={{ height: h }}>
      {/* ── "EDU" — yashil ── */}
      <span
        className={greenCls}
        style={{ fontSize, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.03em', fontFamily: 'inherit' }}
      >
        EDU
      </span>

      {/* ── "BAH" — ko'k ── */}
      <span
        className={blueCls}
        style={{ fontSize, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.03em', fontFamily: 'inherit' }}
      >
        BAH
      </span>

      {/* ── "O" — ko'k doira + sariq yulduz ── */}
      <span
        className="relative inline-flex items-center justify-center"
        style={{ width: fontSize * 0.72, height: fontSize * 0.72, marginLeft: 1 }}
      >
        <span className={`absolute inset-0 rounded-full bg-current ${blueCls}`} />
        <svg
          viewBox="0 0 24 24"
          fill="#FBBF24"
          style={{ position: 'relative', zIndex: 1, width: '60%', height: '60%' }}
          aria-hidden
        >
          <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.3L12 17l-6.2 4.2 2.4-7.3L2 9.4h7.6z" />
        </svg>
      </span>

      {/* ── Icon: bar chart + checkmark ── */}
      <svg
        viewBox="0 0 40 36"
        fill="none"
        style={{ width: iconSize, height: iconSize, marginLeft: size * 0.12 }}
        aria-hidden
      >
        <g className={blueCls}>
          <rect x="1"  y="18" width="9" height="17" rx="2" fill="currentColor" />
          <rect x="15" y="10" width="9" height="25" rx="2" fill="currentColor" />
          <rect x="29" y="2"  width="9" height="33" rx="2" fill="currentColor" />
        </g>
        <path
          className={greenCls}
          d="M3 28 L13 36 L37 10"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}
