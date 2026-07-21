'use client'

import { useRouter, usePathname } from 'next/navigation'
import {
  X, Plus, Laptop, GraduationCap, School, Palette, Globe2, PencilLine,
  Dumbbell, Trophy, ArrowLeftRight, Sparkles, Info,
} from 'lucide-react'
import { useCompare, MAX_COMPARE } from '@/hooks/useCompare'
import { useLang, t } from '@/contexts/LangContext'

const TYPE_ICONS: Record<string, typeof School> = {
  IT_SCHOOL: Laptop, UNIVERSITY: GraduationCap, SCHOOL: School, KINDERGARTEN: Palette,
  LANGUAGE_CENTER: Globe2, COURSE_CENTER: PencilLine, SPORTS_SCHOOL: Dumbbell, LYCEUM: Trophy,
}

export default function CompareBar() {
  const { items, remove, clear, toast, dismissToast } = useCompare()
  const router = useRouter()
  const pathname = usePathname()
  const { lang } = useLang()

  // /compare sahifasining o'zida floating bar keraksiz — foydalanuvchi
  // allaqachon solishtiruv ekranida, qayta "Solishtir"ga undash ortiqcha
  const onComparePage = pathname?.startsWith('/compare')

  const ui = {
    title:   { uz: 'Solishtirish',       ru: 'Сравнение' },
    picked:  { uz: 'tanlandi',           ru: 'выбрано' },
    add:     { uz: "Qo'shish",           ru: 'Добавить' },
    clear:   { uz: 'Tozalash',           ru: 'Очистить' },
    compare: { uz: 'Solishtir',          ru: 'Сравнить' },
    needOne: { uz: 'Yana 1 tasini tanlang', ru: 'Выберите ещё 1' },
  }

  function toastMessage(): string {
    if (!toast) return ''
    if (toast.kind === 'max') {
      return t(lang, {
        uz: `Bir vaqtda ko'pi bilan ${MAX_COMPARE} tagacha solishtirish mumkin`,
        ru: `Можно сравнивать не более ${MAX_COMPARE} учреждений одновременно`,
      })
    }
    if (toast.kind === 'added') {
      const name = toast.itemName ?? ''
      if (toast.count === 1) {
        return t(lang, {
          uz: `"${name}" qo'shildi. Solishtirish uchun yana bittasini tanlang`,
          ru: `«${name}» добавлено. Выберите ещё одно для сравнения`,
        })
      }
      return t(lang, {
        uz: `"${name}" qo'shildi (${toast.count}/${MAX_COMPARE})`,
        ru: `«${name}» добавлено (${toast.count}/${MAX_COMPARE})`,
      })
    }
    return ''
  }

  if (onComparePage) return null
  if (items.length === 0 && !toast) return null

  return (
    <>
      {/* Floating snackbar — "qo'shildi" xabari, o'z-o'zidan yo'qoladi */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-4 z-[60] mx-auto max-w-sm animate-slide-up"
          style={{ bottom: items.length > 0 ? 'calc(env(safe-area-inset-bottom, 0px) + 92px)' : 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
        >
          <div
            className={`flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${
              toast.kind === 'max' ? 'bg-amber-600' : 'bg-gray-900'
            }`}
          >
            {toast.kind === 'max' ? (
              <Info className="h-4 w-4 shrink-0" strokeWidth={2} />
            ) : (
              <Sparkles className="h-4 w-4 shrink-0 text-primary-300" strokeWidth={2} />
            )}
            <span className="flex-1">{toastMessage()}</span>
            <button
              onClick={dismissToast}
              aria-label={t(lang, { uz: 'Yopish', ru: 'Закрыть' })}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up border-t border-primary-200 bg-white shadow-lg"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="mx-auto max-w-4xl px-4 py-3">
            <div className="flex items-center gap-3">
              {/* Title */}
              <div className="hidden shrink-0 whitespace-nowrap sm:block">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t(lang, ui.title)}</p>
                <p className="text-sm font-semibold text-gray-800">{items.length} / {MAX_COMPARE} {t(lang, ui.picked)}</p>
              </div>

              {/* Items */}
              <div className="flex flex-1 gap-2 overflow-x-auto">
                {items.map((item) => {
                  const TypeIcon = TYPE_ICONS[item.type] ?? School
                  const name = lang === 'ru' && item.nameRu ? item.nameRu : item.nameUz
                  return (
                    <div
                      key={item.id}
                      className="flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-primary-200 bg-primary-50 px-3"
                    >
                      <TypeIcon className="h-4 w-4 shrink-0 text-primary-500" strokeWidth={1.75} />
                      <span className="max-w-[120px] truncate text-sm font-medium text-gray-800">
                        {name}
                      </span>
                      <button
                        onClick={() => remove(item.id)}
                        className="ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-red-100 hover:text-red-500"
                        aria-label={t(lang, { uz: `${name}ni olib tashlash`, ru: `Убрать ${name}` })}
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                      </button>
                    </div>
                  )
                })}

                {/* Empty slots */}
                {Array.from({ length: MAX_COMPARE - items.length }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-dashed border-gray-300 px-3 text-sm text-gray-400"
                  >
                    <Plus className="h-4 w-4 shrink-0" strokeWidth={2} />
                    <span>{t(lang, ui.add)}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex shrink-0 items-center gap-2">
                {items.length === 1 && (
                  <span className="hidden whitespace-nowrap text-xs font-medium text-gray-400 md:inline">
                    {t(lang, ui.needOne)}
                  </span>
                )}
                <button
                  onClick={clear}
                  className="whitespace-nowrap rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50"
                >
                  {t(lang, ui.clear)}
                </button>
                <button
                  onClick={() => router.push(`/compare?ids=${items.map((i) => i.id).join(',')}`)}
                  disabled={items.length < 2}
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowLeftRight className="h-4 w-4 shrink-0" strokeWidth={2} />
                  {t(lang, ui.compare)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
