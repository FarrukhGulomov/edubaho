'use client'

import { useRouter } from 'next/navigation'
import { Bookmark, Scale, ArrowRight } from 'lucide-react'
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
        aria-pressed={saved}
        className={`flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-colors ${
          saved
            ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/15'
            : 'border-line-2 bg-surface text-ink hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400'
        }`}
      >
        <Bookmark className="h-4 w-4" fill={saved ? 'currentColor' : 'none'} aria-hidden />
        {saved ? 'Saqlangan' : 'Saqlash'}
      </button>

      {/* Compare */}
      <button
        onClick={handleCompare}
        aria-pressed={compared}
        className={`flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-colors ${
          compared
            ? 'border-primary-300 bg-primary-50 text-primary-700 hover:bg-primary-100 dark:border-primary-500/30 dark:bg-primary-500/10 dark:text-primary-300 dark:hover:bg-primary-500/15'
            : 'border-line-2 bg-surface text-ink hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400'
        }`}
      >
        <Scale className="h-4 w-4" aria-hidden />
        {compared ? "Solishtiruvga qo'shildi" : "Solishtirish uchun qo'shish"}
      </button>

      {/* Go compare */}
      {items.length >= 2 && (
        <button
          onClick={() => router.push(`/compare?ids=${items.map((i) => i.id).join(',')}`)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
        >
          Solishtirishni ko&apos;rish ({items.length} ta)
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  )
}
