'use client'

import Link from 'next/link'
import StarRating from '@/components/shared/StarRating'
import { useLang, t } from '@/contexts/LangContext'

interface CompareInstitution {
  id: string
  nameUz: string
  nameRu?: string
  slug: string
  type: string
  isVerified: boolean
  avgRating?: number
  reviewCount: number
  address?: string
  phone?: string
  telegram?: string
  details?: {
    foundedYear?: number
    studentCount?: number
    teacherCount?: number
    languages?: string[]
  }
  pricing?: {
    monthlyMin?: number
    monthlyMax?: number
    paymentMethods?: string[]
  }
}

function formatUzs(amount?: number) {
  if (!amount) return null
  return `${amount.toLocaleString('uz-UZ').replace(/,/g, ' ')} so'm`
}

const TYPE_LABELS: Record<string, { uz: string; ru: string }> = {
  KINDERGARTEN:    { uz: "Bog'cha",         ru: 'Детский сад' },
  SCHOOL:          { uz: 'Maktab',          ru: 'Школа' },
  LYCEUM:          { uz: 'Litsey',          ru: 'Лицей' },
  COLLEGE:         { uz: 'Kollej',          ru: 'Колледж' },
  UNIVERSITY:      { uz: 'Universitet',    ru: 'Университет' },
  COURSE_CENTER:   { uz: 'Kurs markazi',   ru: 'Учебный центр' },
  LANGUAGE_CENTER: { uz: 'Til markazi',    ru: 'Языковой центр' },
  IT_SCHOOL:       { uz: 'IT maktab',      ru: 'IT школа' },
  TUTORING:        { uz: 'Repetitor',      ru: 'Репетитор' },
  SPORTS_SCHOOL:   { uz: 'Sport maktabi',  ru: 'Спортшкола' },
  ARTS_SCHOOL:     { uz: "San'at maktabi", ru: 'Школа искусств' },
}

const TYPE_ICONS: Record<string, string> = {
  IT_SCHOOL: '💻', UNIVERSITY: '🎓', SCHOOL: '📚', KINDERGARTEN: '🎨',
  LANGUAGE_CENTER: '🌐', COURSE_CENTER: '✏️', SPORTS_SCHOOL: '⚽', LYCEUM: '🏫',
  COLLEGE: '🏛️', TUTORING: '👨‍🏫', ARTS_SCHOOL: '🎭',
}

export default function CompareContent({ institutions }: { institutions: CompareInstitution[] }) {
  const { lang } = useLang()
  const cols = institutions.length

  const ui = {
    title:      { uz: 'Muassasalarni solishtirish', ru: 'Сравнение учреждений' },
    back:       { uz: '← Qidiruvga qaytish',       ru: '← Вернуться к поиску' },
    rating:     { uz: '⭐ Reyting va sharhlar',     ru: '⭐ Рейтинг и отзывы' },
    avgRating:  { uz: 'Umumiy reyting',             ru: 'Общий рейтинг' },
    reviews:    { uz: 'Sharhlar soni',              ru: 'Кол-во отзывов' },
    price:      { uz: '💰 Narxlar',                 ru: '💰 Цены' },
    priceMin:   { uz: 'Oylik narx (min)',           ru: 'Ежемес. цена (мин)' },
    priceMax:   { uz: 'Oylik narx (max)',           ru: 'Ежемес. цена (макс)' },
    payment:    { uz: "To'lov usullari",            ru: 'Способы оплаты' },
    info:       { uz: "ℹ️ Ma'lumotlar",             ru: 'ℹ️ Информация' },
    founded:    { uz: 'Tashkil etilgan',            ru: 'Год основания' },
    students:   { uz: "O'quvchilar",                ru: 'Учеников' },
    teachers:   { uz: "O'qituvchilar",              ru: 'Преподавателей' },
    languages:  { uz: "O'qitish tillari",           ru: 'Языки обучения' },
    contact:    { uz: '📞 Aloqa',                   ru: '📞 Контакты' },
    phone:      { uz: 'Telefon',                    ru: 'Телефон' },
    telegram:   { uz: 'Telegram',                   ru: 'Telegram' },
    address:    { uz: 'Manzil',                     ru: 'Адрес' },
    verified:   { uz: 'Tasdiqlangan',               ru: 'Подтверждено' },
    reviewsUnit:{ uz: 'ta',                         ru: '' },
    viewBtn:    { uz: 'Ko\'proq ko\'rish →',        ru: 'Подробнее →' },
  }

  function Row({ labelKey, values, highlight }: {
    labelKey: keyof typeof ui
    values: (string | null | undefined)[]
    highlight?: boolean
  }) {
    return (
      <tr className={highlight ? 'bg-primary-50/40' : 'hover:bg-gray-50'}>
        <td className="border border-gray-200 px-4 py-3 font-medium text-gray-600 bg-gray-50/80 text-sm whitespace-nowrap w-40">
          {t(lang, ui[labelKey] as { uz: string; ru: string })}
        </td>
        {values.map((val, i) => (
          <td key={i} className="border border-gray-200 px-4 py-3 text-center text-sm text-gray-800">
            {val ?? <span className="text-gray-300">—</span>}
          </td>
        ))}
      </tr>
    )
  }

  function SectionHeader({ labelKey }: { labelKey: keyof typeof ui }) {
    return (
      <tr className="bg-primary-600">
        <td className="border border-primary-500 px-4 py-2.5 font-bold text-white text-sm" colSpan={cols + 1}>
          {t(lang, ui[labelKey] as { uz: string; ru: string })}
        </td>
      </tr>
    )
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 pb-24">
      <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/search" className="hover:text-primary-600">{t(lang, ui.back)}</Link>
      </div>

      <h1 className="mb-8 text-2xl font-bold text-gray-900">
        {t(lang, ui.title)}
        <span className="ml-2 text-base font-normal text-gray-400">({cols} ta)</span>
      </h1>

      {/* Institution header cards */}
      <div
        className="grid gap-4 mb-6"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {institutions.map((inst) => {
          const typeLabel = TYPE_LABELS[inst.type]
          const name = lang === 'ru' && inst.nameRu ? inst.nameRu : inst.nameUz
          return (
            <Link
              key={inst.id}
              href={`/institutions/${inst.slug}`}
              className="rounded-2xl border-2 border-primary-200 bg-white p-5 text-center hover:border-primary-400 hover:shadow-md transition-all"
            >
              <div className="mb-2 text-4xl">{TYPE_ICONS[inst.type] ?? '🏫'}</div>
              <h2 className="font-bold text-gray-900 leading-tight mb-1 line-clamp-2">{name}</h2>
              <span className="text-xs text-gray-400">
                {typeLabel ? t(lang, typeLabel) : inst.type}
              </span>
              {inst.isVerified && (
                <div className="mt-2 text-xs font-semibold text-green-600">
                  ✓ {t(lang, ui.verified)}
                </div>
              )}
              {inst.avgRating && (
                <div className="mt-2 flex justify-center">
                  <StarRating rating={inst.avgRating} size="sm" />
                </div>
              )}
            </Link>
          )
        })}
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
        <table className="w-full border-collapse text-sm">
          <tbody>
            <SectionHeader labelKey="rating" />
            <Row
              labelKey="avgRating"
              highlight
              values={institutions.map((i) =>
                i.avgRating
                  ? `${'★'.repeat(Math.round(i.avgRating))}${'☆'.repeat(5 - Math.round(i.avgRating))} ${i.avgRating.toFixed(1)}`
                  : null
              )}
            />
            <Row
              labelKey="reviews"
              values={institutions.map((i) =>
                `${i.reviewCount} ${t(lang, ui.reviewsUnit)}`
              )}
            />

            <SectionHeader labelKey="price" />
            <Row
              labelKey="priceMin"
              highlight
              values={institutions.map((i) => formatUzs(i.pricing?.monthlyMin))}
            />
            <Row
              labelKey="priceMax"
              values={institutions.map((i) => formatUzs(i.pricing?.monthlyMax))}
            />
            <Row
              labelKey="payment"
              values={institutions.map((i) => i.pricing?.paymentMethods?.join(', ') ?? null)}
            />

            <SectionHeader labelKey="info" />
            <Row
              labelKey="founded"
              values={institutions.map((i) => i.details?.foundedYear ? String(i.details.foundedYear) : null)}
            />
            <Row
              labelKey="students"
              highlight
              values={institutions.map((i) =>
                i.details?.studentCount
                  ? `${i.details.studentCount.toLocaleString()} ${t(lang, ui.reviewsUnit)}`
                  : null
              )}
            />
            <Row
              labelKey="teachers"
              values={institutions.map((i) =>
                i.details?.teacherCount
                  ? `${i.details.teacherCount} ${t(lang, ui.reviewsUnit)}`
                  : null
              )}
            />
            <Row
              labelKey="languages"
              values={institutions.map((i) =>
                i.details?.languages?.length
                  ? i.details.languages.join(', ').toUpperCase()
                  : null
              )}
            />

            <SectionHeader labelKey="contact" />
            <Row labelKey="phone"    values={institutions.map((i) => i.phone    ?? null)} />
            <Row labelKey="telegram" values={institutions.map((i) => i.telegram ? `@${i.telegram}` : null)} />
            <Row labelKey="address"  values={institutions.map((i) => i.address  ?? null)} />
          </tbody>
        </table>
      </div>

      {/* CTA buttons */}
      <div
        className="mt-6 grid gap-4"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {institutions.map((inst) => {
          const name = lang === 'ru' && inst.nameRu ? inst.nameRu : inst.nameUz
          return (
            <Link
              key={inst.id}
              href={`/institutions/${inst.slug}`}
              className="block rounded-2xl bg-primary-600 py-3 text-center font-bold text-white hover:bg-primary-700 transition-colors"
            >
              {name} →
            </Link>
          )
        })}
      </div>
    </main>
  )
}
