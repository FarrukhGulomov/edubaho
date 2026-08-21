import Image from 'next/image'
import {
  BookOpen, Trophy, GraduationCap, PencilLine, Globe2, Laptop, UserCheck, Dumbbell, Palette,
} from 'lucide-react'

// Muassasa turi bo'yicha ikonka — InstitutionDetail.tsx'dagi TYPE_ICONS bilan bir xil
const TYPE_ICONS: Record<string, typeof BookOpen> = {
  KINDERGARTEN:    Palette,
  SCHOOL:          BookOpen,
  LYCEUM:          Trophy,
  COLLEGE:         GraduationCap,
  UNIVERSITY:      GraduationCap,
  COURSE_CENTER:   PencilLine,
  LANGUAGE_CENTER: Globe2,
  IT_SCHOOL:       Laptop,
  TUTORING:        UserCheck,
  SPORTS_SCHOOL:   Dumbbell,
  ARTS_SCHOOL:     Palette,
}

interface Props {
  media?: { url: string; thumbnailUrl?: string | null }[]
  type: string
  /** alt matni uchun — muassasa nomi (+ ixtiyoriy shahar) */
  name: string
  className?: string
  sizes?: string
  priority?: boolean
  /** true bo'lsa thumbnail (kichik) o'rniga to'liq o'lchamli rasm ishlatiladi */
  fullSize?: boolean
}

/**
 * Muassasa muqova surati — rasm mavjud bo'lsa next/image bilan, bo'lmasa
 * turi bo'yicha ikonkali gradient placeholder bilan ko'rsatiladi. Rasm hali
 * yuklanmagan muassasalar ko'p bo'lgani uchun (admin panel yangi funksiya)
 * placeholder "buzilgan" emas, atayin dizayn qilingan holatda bo'lishi kerak.
 */
export default function InstitutionCoverImage({ media, type, name, className = '', sizes, priority, fullSize }: Props) {
  const cover = media?.[0]
  const src = cover ? (fullSize ? cover.url : (cover.thumbnailUrl || cover.url)) : null
  const Icon = TYPE_ICONS[type] ?? BookOpen

  if (src) {
    return (
      <div className={`relative overflow-hidden bg-gray-100 ${className}`}>
        <Image
          src={src}
          alt={name}
          fill
          sizes={sizes ?? '(max-width: 768px) 50vw, 33vw'}
          priority={priority}
          className="object-cover"
        />
      </div>
    )
  }

  return (
    <div className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary-50 to-primary-100/70 ${className}`}>
      <Icon className="h-8 w-8 text-primary-300" strokeWidth={1.5} />
    </div>
  )
}
