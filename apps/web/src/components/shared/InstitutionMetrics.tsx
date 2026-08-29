import { MapPin, Users2, UserCheck, CalendarDays } from 'lucide-react'
import { formatStudentRange } from '@/lib/studentRange'
import { t, type Lang } from '@/contexts/LangContext'

/**
 * Muassasa kartasidagi ko'rsatkichlar (shahar, o'quvchi/o'qituvchi soni,
 * tashkil topgan yil).
 *
 * Nega alohida komponent: ilgari bu raqamlar FAQAT ikonka bilan chiqardi —
 * "500–1 000", "30", "90" degan sonlar nimani bildirishini bilib bo'lmasdi
 * (ayniqsa ekran o'quvchi dasturidan foydalanuvchilar uchun umuman
 * tushunarsiz edi). Endi har bir sonning yonida qisqa yozuv bor, va
 * `aria-label` orqali to'liq nomi beriladi.
 *
 * Tor kartada yozuv qisqaradi ("o'quvchi"), lekin accessible nom
 * ("500–1 000 o'quvchi") har doim to'liq qoladi.
 */

const UI = {
  students: { uz: "o'quvchi",   ru: 'учеников' },
  teachers: { uz: "o'qituvchi", ru: 'преподавателей' },
  since:    { uz: '-yildan',    ru: ' года' },
  location: { uz: 'Manzil',     ru: 'Расположение' },
}

export interface InstitutionMetricsData {
  city?: string | null
  studentCount?: number | null
  teacherCount?: number | null
  foundedYear?: number | null
}

export default function InstitutionMetrics({
  data,
  lang,
  className = '',
}: {
  data: InstitutionMetricsData
  lang: Lang
  /** Tashqi joylashuv (masalan matn o'lchami) — komponent o'zi qator sifatida chiqadi */
  className?: string
}) {
  const { city, studentCount, teacherCount, foundedYear } = data
  const items: React.ReactNode[] = []

  if (city) {
    items.push(
      <span key="city" className="flex min-w-0 items-center gap-1">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" strokeWidth={1.75} aria-hidden="true" />
        <span className="sr-only">{t(lang, UI.location)}: </span>
        <span className="truncate">{city}</span>
      </span>,
    )
  }

  if (studentCount && studentCount > 0) {
    const range = formatStudentRange(studentCount)
    const label = t(lang, UI.students)
    items.push(
      <span key="students" className="flex items-center gap-1 font-semibold text-primary-600">
        <Users2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
        <span aria-label={`${range} ${label}`}>
          {range} <span className="font-medium text-gray-500">{label}</span>
        </span>
      </span>,
    )
  }

  if (teacherCount && teacherCount > 0) {
    const label = t(lang, UI.teachers)
    items.push(
      <span key="teachers" className="flex items-center gap-1 font-semibold text-gray-600">
        <UserCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
        <span aria-label={`${teacherCount} ${label}`}>
          {teacherCount} <span className="font-medium text-gray-500">{label}</span>
        </span>
      </span>,
    )
  }

  if (foundedYear && foundedYear > 1800) {
    // O'zbekcha: "2010-yildan beri" · Ruscha: "с 2010 года"
    const text = lang === 'ru' ? `с ${foundedYear} года` : `${foundedYear}-yildan beri`
    items.push(
      <span key="founded" className="flex items-center gap-1 text-gray-500">
        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-gray-400" strokeWidth={1.75} aria-hidden="true" />
        <span>{text}</span>
      </span>,
    )
  }

  if (items.length === 0) return null

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 ${className}`}>
      {items}
    </div>
  )
}
