'use client'

import { useRouter } from 'next/navigation'
import {
  X, Plus, Laptop, GraduationCap, School, Palette, Globe2, PencilLine,
  Dumbbell, Trophy,
} from 'lucide-react'
import { useCompare } from '@/hooks/useCompare'
import { useLang, t } from '@/contexts/LangContext'

const TYPE_ICONS: Record<string, typeof School> = {
  IT_SCHOOL: Laptop, UNIVERSITY: GraduationCap, SCHOOL: School, KINDERGARTEN: Palette,
  LANGUAGE_CENTER: Globe2, COURSE_CENTER: PencilLine, SPORTS_SCHOOL: Dumbbell, LYCEUM: Trophy,
}

export default function CompareBar() {
  const { items, remove, clear } = useCompare()
  const router = useRouter()
  const { lang } = useLang()

  const ui = {
    title:   { uz: 'Solishtirish',       ru: 'Сравнение' },
    picked:  { uz: 'tanlandi',           ru: 'выбрано' },
    add:     { uz: "Qo'shish",           ru: 'Добавить' },
    clear:   { uz: 'Tozalash',           ru: 'Очистить' },
    compare: { uz: 'Solishtir',          ru: 'Сравнить' },
  }

  if (items.length === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-primary-200 bg-white shadow-lg">
      <div className="mx-auto max-w-4xl px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Title */}
          <div className="hidden shrink-0 whitespace-nowrap sm:block">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t(lang, ui.title)}</p>
            <p className="text-sm font-semibold text-gray-800">{items.length} / 3 {t(lang, ui.picked)}</p>
          </div>

          {/* Items */}
          <div className="flex flex-1 gap-2 overflow-x-auto">
            {items.map((item) => {
              const TypeIcon = TYPE_ICONS[item.type] ?? School
              return (
                <div
                  key={item.id}
                  className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-primary-200 bg-primary-50 px-3 py-2"
                >
                  <TypeIcon className="h-4 w-4 shrink-0 text-primary-500" strokeWidth={1.75} />
                  <span className="max-w-[120px] truncate text-sm font-medium text-gray-800">
                    {item.nameUz}
                  </span>
                  <button
                    onClick={() => remove(item.id)}
                    className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-red-100 hover:text-red-500"
                    aria-label="O'chirish"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </button>
                </div>
              )
            })}

            {/* Empty slots */}
            {Array.from({ length: 3 - items.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-400"
              >
                <Plus className="h-4 w-4 shrink-0" strokeWidth={2} />
                <span>{t(lang, ui.add)}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex shrink-0 gap-2">
            <button
              onClick={clear}
              className="whitespace-nowrap rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50"
            >
              {t(lang, ui.clear)}
            </button>
            <button
              onClick={() => router.push(`/compare?ids=${items.map((i) => i.id).join(',')}`)}
              disabled={items.length < 2}
              className="whitespace-nowrap rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
            >
              {t(lang, ui.compare)} →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
