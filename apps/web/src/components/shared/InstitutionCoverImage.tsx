import Image from 'next/image'

interface Props {
  media?: { url: string; thumbnailUrl?: string | null }[]
  /** alt matni uchun — muassasa nomi (+ ixtiyoriy shahar) */
  name: string
  className?: string
  sizes?: string
  priority?: boolean
  /** true bo'lsa thumbnail (kichik) o'rniga to'liq o'lchamli rasm ishlatiladi */
  fullSize?: boolean
  /**
   * Rasm yo'q bo'lganda nima qilish:
   *  'initials' — muassasa nomining bosh harflari (kartalar uchun: har bir
   *               karta o'ziga xos ko'rinadi, ro'yxatda ajratib turadi)
   *  'none'     — hech narsa chiqmaydi (ilgarigi xatti-harakat)
   */
  fallback?: 'initials' | 'none'
}

/**
 * Muassasa nomidan qisqa monogramma: "PDP Academy" → "PA", "IELTS" → "IE".
 * Lotin/kirill harflari bilan ham ishlaydi.
 */
function initialsOf(name: string): string {
  const words = name
    .replace(/["'«»`]/g, '')
    .split(/[\s\-–—]+/)
    .filter((w) => /\p{L}/u.test(w))
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

/**
 * Nomdan barqaror (har safar bir xil) rang tanlaydi — tasodifiy emas,
 * shuning uchun bitta muassasa doim bir xil rangda ko'rinadi. Ranglar
 * BilimOn palitrasidan: ko'k/siyoh/moviy oilasi, ortiqcha gradient yo'q.
 */
const FALLBACK_TONES = [
  'bg-primary-50 text-primary-700 border-primary-100',
  'bg-sky-50 text-sky-700 border-sky-100',
  'bg-indigo-50 text-indigo-700 border-indigo-100',
  'bg-teal-50 text-teal-700 border-teal-100',
  'bg-slate-100 text-slate-600 border-slate-200',
]
function toneOf(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return FALLBACK_TONES[h % FALLBACK_TONES.length]
}

/**
 * Muassasa muqova surati.
 *
 * Rasm bo'lsa — next/image. Rasm bo'lmasa `fallback` ga qarab:
 * bosh harfli monogramma (kartalarda — muassasalarni bir-biridan ajratib
 * turadi) yoki hech narsa. Soxta logotip/tasodifiy rasm ISHLATILMAYDI.
 */
export default function InstitutionCoverImage({
  media, name, className = '', sizes, priority, fullSize, fallback = 'none',
}: Props) {
  const cover = media?.[0]
  const src = cover ? (fullSize ? cover.url : (cover.thumbnailUrl || cover.url)) : null

  if (!src) {
    if (fallback !== 'initials') return null
    return (
      <div
        className={`flex items-center justify-center border-b ${toneOf(name)} ${className}`}
        role="img"
        aria-label={name}
      >
        <span className="select-none text-3xl font-black tracking-tight opacity-80" aria-hidden="true">
          {initialsOf(name)}
        </span>
      </div>
    )
  }

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
