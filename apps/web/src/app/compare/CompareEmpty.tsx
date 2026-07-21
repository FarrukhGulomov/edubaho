'use client'

import Link from 'next/link'
import { Search, ArrowLeftRight, Star } from 'lucide-react'
import { useLang, t } from '@/contexts/LangContext'

/**
 * Solishtirish uchun yetarli muassasa tanlanmagan holat.
 * Server sahifada til kontekstiga kirib bo'lmagani uchun alohida
 * client component — matnlar bitta tilda, aralash emas.
 */
export default function CompareEmpty() {
  const { lang } = useLang()

  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center sm:py-24">
      {/* Original inline illyustratsiya — ikkita karta + "VS" belgisi */}
      <div className="mx-auto mb-8 flex max-w-xs items-center justify-center gap-3">
        <div className="animate-float-slow flex h-24 w-20 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-primary-100 bg-white shadow-sm">
          <span className="h-7 w-7 rounded-lg bg-primary-50" />
          <span className="h-1.5 w-10 rounded-full bg-gray-100" />
          <span className="h-1.5 w-7 rounded-full bg-gray-100" />
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-black text-white shadow-md">
          <ArrowLeftRight className="h-4 w-4" strokeWidth={2.5} />
        </span>
        <div className="animate-float flex h-24 w-20 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-primary-100 bg-white shadow-sm">
          <span className="h-7 w-7 rounded-lg bg-amber-50" />
          <span className="h-1.5 w-10 rounded-full bg-gray-100" />
          <span className="h-1.5 w-7 rounded-full bg-gray-100" />
        </div>
      </div>

      <h1 className="mb-2.5 text-2xl font-bold text-gray-900 sm:text-3xl">
        {t(lang, {
          uz: 'Qaysi biri sizga mos — solishtirib bilib oling',
          ru: 'Какое подходит именно вам — узнайте через сравнение',
        })}
      </h1>
      <p className="mb-8 text-[15px] leading-relaxed text-gray-500">
        {t(lang, {
          uz: "2 tadan 4 tagacha ta'lim muassasasini tanlang — narx, reyting, o'qituvchilar va boshqa muhim jihatlarni yonma-yon ko'ramiz va sizga qaysi biri mosroq ekanini aytamiz.",
          ru: 'Выберите от 2 до 4 учебных заведений — покажем цену, рейтинг, преподавателей и другое рядом и подскажем, какое подходит вам лучше.',
        })}
      </p>

      <Link
        href="/search"
        className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-8 py-3.5 font-bold text-white shadow-sm transition-colors hover:bg-primary-700"
      >
        <Search className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
        {t(lang, { uz: "Muassasalarni topish", ru: 'Найти учреждения' })}
      </Link>

      <div className="mx-auto mt-8 flex max-w-xs items-center justify-center gap-2 rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-400">
        <Star className="h-3.5 w-3.5 shrink-0 text-amber-400" strokeWidth={1.75} fill="currentColor" />
        {t(lang, {
          uz: 'Har bir muassasa kartasidagi "Solishtirish" tugmasini bosing',
          ru: 'Нажмите «Сравнить» на карточке любого учреждения',
        })}
      </div>
    </main>
  )
}
