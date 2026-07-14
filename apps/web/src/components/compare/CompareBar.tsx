'use client'

import { useRouter } from 'next/navigation'
import { X, ArrowRight, Plus } from 'lucide-react'
import { useCompare } from '@/hooks/useCompare'
import TypeIcon from '@/components/shared/TypeIcon'

export default function CompareBar() {
  const { items, remove, clear } = useCompare()
  const router = useRouter()

  if (items.length === 0) return null

  return (
    <div className="glass fixed bottom-0 left-0 right-0 z-50 animate-slide-up border-t border-line shadow-pop">
      <div className="mx-auto max-w-4xl px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Title */}
          <div className="hidden shrink-0 sm:block">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">Solishtirish</p>
            <p className="text-sm font-semibold tabular-nums text-ink">{items.length} / 3 tanlandi</p>
          </div>

          {/* Items */}
          <div className="flex flex-1 gap-2 overflow-x-auto">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex shrink-0 items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 dark:border-primary-500/25 dark:bg-primary-500/10"
              >
                <TypeIcon type={item.type} className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                <span className="max-w-[120px] truncate text-sm font-medium text-ink">
                  {item.nameUz}
                </span>
                <button
                  onClick={() => remove(item.id)}
                  className="ml-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-faint transition-colors hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-500/20"
                  style={{ minHeight: 0, minWidth: 0 }}
                  aria-label={`${item.nameUz} — o'chirish`}
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: 3 - items.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-line-2 px-3 py-2 text-sm text-faint"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                <span>Qo&apos;shish</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex shrink-0 gap-2">
            <button
              onClick={clear}
              className="rounded-lg px-3 py-2 text-sm font-medium text-mute transition-colors hover:bg-surface-2 hover:text-ink"
            >
              Tozalash
            </button>
            <button
              onClick={() => router.push(`/compare?ids=${items.map((i) => i.id).join(',')}`)}
              disabled={items.length < 2}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
            >
              Solishtir
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
