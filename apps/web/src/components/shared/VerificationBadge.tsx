import { BadgeCheck, ShieldCheck } from 'lucide-react'

export type VerificationLevel = 'UNVERIFIED' | 'CLAIMED' | 'VERIFIED'

interface Props {
  level: VerificationLevel
  lang: 'uz' | 'ru'
  size?: 'xs' | 'sm' | 'md'
  className?: string
}

/**
 * Muassasa ishonch darajasi belgisi — 3 bosqichli tizim:
 * 🟢 VERIFIED — Bilimon shaxsan tekshirgan
 * 🔵 CLAIMED  — egasi profilni o'ziga olgan, lekin hali chuqur tekshirilmagan
 * ⚪ UNVERIFIED — belgi umuman ko'rsatilmaydi (mavjud "faqat ijobiy holatda
 *   ko'rsatish" naqshini davom ettiradi — har bir kartaga "tekshirilmagan"
 *   degan salbiy yorliq yopishtirib chiqmaslik uchun)
 */
export default function VerificationBadge({ level, lang, size = 'sm', className = '' }: Props) {
  if (level === 'UNVERIFIED') return null

  const isVerified = level === 'VERIFIED'
  const Icon = isVerified ? BadgeCheck : ShieldCheck
  const label = isVerified
    ? (lang === 'ru' ? 'Подтверждено' : 'Tasdiqlangan')
    : (lang === 'ru' ? 'Профиль активен' : 'Profil faollashtirilgan')
  const colorClasses = isVerified
    ? 'bg-emerald-50 text-emerald-700'
    : 'bg-sky-50 text-sky-700'
  const sizeClasses = size === 'xs'
    ? 'gap-1 px-2 py-0.5 text-[11px]'
    : size === 'sm'
      ? 'gap-1 px-2.5 py-1 text-xs'
      : 'gap-1.5 px-3 py-1.5 text-sm'
  const iconSize = size === 'md' ? 'h-3.5 w-3.5' : 'h-3 w-3'

  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${colorClasses} ${sizeClasses} ${className}`}>
      <Icon className={`${iconSize} shrink-0`} strokeWidth={2} />
      {label}
    </span>
  )
}
