import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import BrandMark from '@/components/shared/BrandMark'

export interface Crumb {
  label: string
  /** Bo'lsa — havola, bo'lmasa joriy sahifa (oxirgi element) */
  href?: string
}

/**
 * Admin panel sarlavhasidagi yo'l ko'rsatkich (breadcrumb).
 *
 * Nega alohida komponent: bu blok 16 ta admin sahifada nusxalangan edi va
 * ular asta-sekin bir-biridan farq qila boshlagan. Endi bitta joyda.
 *
 * Ikkita muhim tafsilot:
 *
 * 1) TEKISLASH. globals.css'da barcha `a` va `button` uchun
 *    `min-height: 44px` bor (touch target). Oddiy matnli havolada bu
 *    44px'lik quti hosil qiladi va matn shu qutining TEPASIDA qolib
 *    ketadi — natijada "Muassasalar" qo'shnilaridan balandroq ko'rinardi.
 *    Shuning uchun har bir havola `inline-flex items-center` va
 *    `min-h-0 min-w-0` bilan beriladi: matn o'z qutisida markazlashadi.
 *    Bosish maydoni esa `py-2 -my-2` orqali kengaytiriladi — barmoq bilan
 *    bosish qulay bo'ladi, lekin qatorning balandligi o'zgarmaydi.
 *
 * 2) AJRATUVCHI. `›` belgisi o'rniga ikonka ishlatiladi — matn belgisining
 *    balandligi shrift va qurilmaga qarab o'zgarib turadi, ikonka esa
 *    hamma joyda bir xil.
 */
export default function AdminBreadcrumb({ items }: { items: Crumb[] }) {
  // Oxirgi element — joriy sahifa: u har doim ko'rinadi va joy yetmasa
  // qisqartiriladi. Oradagilar tor ekranda yashiriladi (mobilda
  // "BilimOn › Joriy sahifa" qoladi — siqilib ketmaydi).
  const middle = items.slice(0, -1)
  const current = items[items.length - 1]

  return (
    <nav
      aria-label="Yo'l ko'rsatkich"
      className="flex min-w-0 flex-1 items-center gap-1.5 text-sm sm:gap-2"
    >
      <Link
        href="/"
        className="inline-flex min-h-0 min-w-0 shrink-0 items-center gap-1.5 whitespace-nowrap py-2 -my-2 font-bold text-primary-600"
      >
        <BrandMark size={16} className="shrink-0" />
        <span className="hidden sm:inline">BilimOn</span>
      </Link>

      {middle.map((c) => (
        <span key={c.label} className="hidden shrink-0 items-center gap-1.5 sm:inline-flex sm:gap-2">
          <Separator />
          {c.href ? (
            <Link
              href={c.href}
              className="inline-flex min-h-0 min-w-0 items-center whitespace-nowrap py-2 -my-2 text-gray-500 transition-colors hover:text-gray-700"
            >
              {c.label}
            </Link>
          ) : (
            <span className="whitespace-nowrap text-gray-500">{c.label}</span>
          )}
        </span>
      ))}

      <Separator />
      <span className="min-w-0 truncate font-semibold text-gray-700">{current.label}</span>
    </nav>
  )
}

function Separator() {
  return (
    <ChevronRight
      className="h-4 w-4 shrink-0 text-gray-300"
      strokeWidth={2}
      aria-hidden="true"
    />
  )
}
