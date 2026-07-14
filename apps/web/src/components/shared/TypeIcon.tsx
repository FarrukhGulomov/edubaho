import {
  BookOpen,
  GraduationCap,
  Laptop,
  Globe,
  PencilLine,
  Palette,
  Trophy,
  School,
  type LucideIcon,
} from 'lucide-react'

/**
 * Muassasa turi → lucide ikonka xaritasi.
 * Emoji o'rniga vektor ikonkalar — barcha platformalarda bir xil ko'rinadi.
 */
const TYPE_ICON_MAP: Record<string, LucideIcon> = {
  COURSE_CENTER:   PencilLine,
  SCHOOL:          BookOpen,
  IT_SCHOOL:       Laptop,
  LANGUAGE_CENTER: Globe,
  UNIVERSITY:      GraduationCap,
  KINDERGARTEN:    Palette,
  SPORTS_SCHOOL:   Trophy,
  LYCEUM:          School,
}

interface TypeIconProps {
  type: string
  className?: string
}

export default function TypeIcon({ type, className = 'h-4 w-4' }: TypeIconProps) {
  const Icon = TYPE_ICON_MAP[type] ?? School
  return <Icon className={className} aria-hidden />
}
