'use client'

import { useRouter } from 'next/navigation'
import { useCompare, useSaved } from '@/hooks/useCompare'

interface Props {
  institution: {
    id: string
    slug: string
    nameUz: string
    type: string
    avgRating?: number
    pricing?: { monthlyMin?: number }
  }
}

export default function InstActions({ institution }: Props) {
  const router = useRouter()
  const { toggle, isSelected, items } = useCompare()
  const { toggleSave, isSaved } = useSaved()
  const compared = isSelected(institution.id)
  const saved = isSaved(institution.id)

  function handleCompare() {
    toggle({
      id: institution.id,
      slug: institution.slug,
      nameUz: institution.nameUz,
      type: institution.type,
      avgRating: institution.avgRating,
      pricing: institution.pricing,
    })
  }

  function handleSave() {
    toggleSave({
      id: institution.id,
      slug: institution.slug,
      nameUz: institution.nameUz,
      type: institution.type,
      avgRating: institution.avgRating,
      pricing: institution.pricing,
    })
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Save */}
      <button
        onClick={handleSave}
        className={`flex w-full items-center justify-center gap-2 rounded-xl border-2 py-3 font-semibold transition-colors ${
          saved
            ? 'border-yellow-400 bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
            : 'border-gray-300 bg-white text-gray-700 hover:border-primary-400 hover:bg-primary-50'
        }`}
      >
        <span className="text-xl">{saved ? '⭐' : '☆'}</span>
        {saved ? 'Saqlangan' : 'Saqlash'}
      </button>

      {/* Compare */}
      <button
        onClick={handleCompare}
        className={`flex w-full items-center justify-center gap-2 rounded-xl border-2 py-3 font-semibold transition-colors ${
          compared
            ? 'border-primary-500 bg-primary-50 text-primary-700 hover:bg-primary-100'
            : 'border-gray-300 bg-white text-gray-700 hover:border-primary-400 hover:bg-primary-50'
        }`}
      >
        <span className="text-xl">⇄</span>
        {compared ? 'Solishtiruvga qo\'shildi' : 'Solishtirish uchun qo\'shish'}
      </button>

      {/* Go compare */}
      {items.length >= 2 && (
        <button
          onClick={() => router.push(`/compare?ids=${items.map((i) => i.id).join(',')}`)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-3 font-bold text-white hover:bg-primary-700 transition-colors"
        >
          Solishtirishni ko&apos;rish ({items.length} ta) →
        </button>
      )}
    </div>
  )
}
