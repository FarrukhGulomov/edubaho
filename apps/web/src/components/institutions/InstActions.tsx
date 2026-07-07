'use client'

import { useRouter } from 'next/navigation'
import { Star, ArrowLeftRight } from 'lucide-react'
import { useCompare, useSaved } from '@/hooks/useCompare'
import { useLang, t } from '@/contexts/LangContext'

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
  const { lang } = useLang()
  const { toggle, isSelected, items } = useCompare()
  const { toggleSave, isSaved } = useSaved()
  const compared = isSelected(institution.id)
  const saved = isSaved(institution.id)

  const ui = {
    save:       { uz: 'Saqlash',                     ru: 'Сохранить' },
    saved:      { uz: 'Saqlangan',                    ru: 'Сохранено' },
    compare:    { uz: 'Solishtirish uchun qo\'shish', ru: 'Добавить к сравнению' },
    compared:   { uz: 'Solishtiruvga qo\'shildi',     ru: 'Добавлено к сравнению' },
    goCompare:  { uz: 'Solishtirishni ko\'rish',      ru: 'Смотреть сравнение' },
  }

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
        className={`flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-colors ${
          saved
            ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
            : 'border-gray-300 bg-white text-gray-700 hover:border-primary-300 hover:bg-primary-50'
        }`}
      >
        <Star className="h-[18px] w-[18px]" fill={saved ? 'currentColor' : 'none'} strokeWidth={2} />
        {saved ? t(lang, ui.saved) : t(lang, ui.save)}
      </button>

      {/* Compare */}
      <button
        onClick={handleCompare}
        className={`flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-colors ${
          compared
            ? 'border-primary-400 bg-primary-50 text-primary-700 hover:bg-primary-100'
            : 'border-gray-300 bg-white text-gray-700 hover:border-primary-300 hover:bg-primary-50'
        }`}
      >
        <ArrowLeftRight className="h-[18px] w-[18px]" strokeWidth={2} />
        {compared ? t(lang, ui.compared) : t(lang, ui.compare)}
      </button>

      {/* Go compare */}
      {items.length >= 2 && (
        <button
          onClick={() => router.push(`/compare?ids=${items.map((i) => i.id).join(',')}`)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
        >
          {t(lang, ui.goCompare)} ({items.length}) →
        </button>
      )}
    </div>
  )
}
