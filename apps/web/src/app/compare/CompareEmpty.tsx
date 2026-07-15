'use client'

import Link from 'next/link'
import { ArrowLeftRight } from 'lucide-react'
import { useLang, t } from '@/contexts/LangContext'

/**
 * Solishtirish uchun yetarli muassasa tanlanmagan holat.
 * Server sahifada til kontekstiga kirib bo'lmagani uchun alohida
 * client component — matnlar bitta tilda, aralash emas.
 */
export default function CompareEmpty() {
  const { lang } = useLang()

  return (
    <main className="mx-auto max-w-4xl px-4 py-20 text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-2">
        <ArrowLeftRight className="h-7 w-7 text-faint" strokeWidth={1.5} />
      </div>
      <h1 className="mb-2 text-2xl font-bold text-ink">
        {t(lang, { uz: 'Kamida 2 ta muassasa tanlang', ru: 'Выберите минимум 2 учреждения' })}
      </h1>
      <p className="mb-8 text-sm text-mute">
        {t(lang, {
          uz: 'Muassasalar yonidagi "Solishtir" tugmasini bosing',
          ru: 'Нажмите кнопку "Сравнить" рядом с учреждениями',
        })}
      </p>
      <Link
        href="/search"
        className="btn-primary px-8"
      >
        {t(lang, { uz: "Muassasalarni ko'rish", ru: 'Смотреть учреждения' })}
      </Link>
    </main>
  )
}
