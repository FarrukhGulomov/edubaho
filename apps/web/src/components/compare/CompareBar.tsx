'use client'

import { useRouter } from 'next/navigation'
import { useCompare } from '@/hooks/useCompare'

const TYPE_ICONS: Record<string, string> = {
  IT_SCHOOL: '💻', UNIVERSITY: '🎓', SCHOOL: '📚', KINDERGARTEN: '🎨',
  LANGUAGE_CENTER: '🌐', COURSE_CENTER: '✏️', SPORTS_SCHOOL: '⚽', LYCEUM: '🏫',
}

export default function CompareBar() {
  const { items, remove, clear } = useCompare()
  const router = useRouter()

  if (items.length === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-primary-500 shadow-2xl">
      <div className="mx-auto max-w-4xl px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Title */}
          <div className="hidden shrink-0 sm:block">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Solishtirish</p>
            <p className="text-sm font-bold text-gray-800">{items.length} / 3 tanlandi</p>
          </div>

          {/* Items */}
          <div className="flex flex-1 gap-2 overflow-x-auto">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex shrink-0 items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2"
              >
                <span className="text-lg">{TYPE_ICONS[item.type] ?? '🏫'}</span>
                <span className="max-w-[120px] truncate text-sm font-medium text-gray-800">
                  {item.nameUz}
                </span>
                <button
                  onClick={() => remove(item.id)}
                  className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-red-100 hover:text-red-500 transition-colors"
                  aria-label="O'chirish"
                >
                  ×
                </button>
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: 3 - items.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex shrink-0 items-center gap-2 rounded-xl border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-400"
              >
                <span>+</span>
                <span>Qo&apos;shish</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex shrink-0 gap-2">
            <button
              onClick={clear}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
            >
              Tozalash
            </button>
            <button
              onClick={() => router.push(`/compare?ids=${items.map((i) => i.id).join(',')}`)}
              disabled={items.length < 2}
              className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              Solishtir →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
