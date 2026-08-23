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
}

/**
 * Muassasa muqova surati — rasm mavjud bo'lsa next/image bilan ko'rsatiladi.
 * Rasm yo'q bo'lsa HECH NARSA render qilinmaydi (bo'sh ikonkali placeholder
 * bo'sh joy sifatida xunuk ko'rinar edi) — karta shunchaki rasmsiz, qisqaroq
 * balandlikda qoladi.
 */
export default function InstitutionCoverImage({ media, name, className = '', sizes, priority, fullSize }: Props) {
  const cover = media?.[0]
  const src = cover ? (fullSize ? cover.url : (cover.thumbnailUrl || cover.url)) : null
  if (!src) return null

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
