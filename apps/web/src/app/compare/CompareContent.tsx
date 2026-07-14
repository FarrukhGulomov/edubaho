'use client'

import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Phone, MessageCircle, MapPin, Star } from 'lucide-react'
import StarRating from '@/components/shared/StarRating'
import TypeIcon from '@/components/shared/TypeIcon'
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

function formatUzs(amount?: number): string | null {
  if (!amount) return null
  return `${amount.toLocaleString('uz-UZ').replace(/,/g, ' ')} so'm`
}

const TYPE_LABELS: Record<string, { uz: string; ru: string }> = {
  KINDERGARTEN:    { uz: "Bog'cha",         ru: 'Детский сад' },
  SCHOOL:          { uz: 'Maktab',          ru: 'Школа' },
  LYCEUM:          { uz: 'Litsey',          ru: 'Лицей' },
  COLLEGE:         { uz: 'Kollej',          ru: 'Колледж' },
  UNIVERSITY:      { uz: 'Universitet',     ru: 'Университет' },
  COURSE_CENTER:   { uz: 'Kurs markazi',    ru: 'Учебный центр' },
  LANGUAGE_CENTER: { uz: 'Til markazi',     ru: 'Языковой центр' },
  IT_SCHOOL:       { uz: 'IT maktab',       ru: 'IT школа' },
  TUTORING:        { uz: 'Repetitor',       ru: 'Репетитор' },
  SPORTS_SCHOOL:   { uz: 'Sport maktabi',   ru: 'Спортшкола' },
  ARTS_SCHOOL:     { uz: "San'at maktabi",  ru: 'Школа искусств' },
}

const ui = {
  title:       { uz: 'Muassasalarni solishtirish', ru: 'Сравнение учреждений' },
  back:        { uz: 'Qidiruvga qaytish',          ru: 'Вернуться к поиску' },
  rating:      { uz: 'Reyting va sharhlar',        ru: 'Рейтинг и отзывы' },
  avgRating:   { uz: 'Umumiy reyting',             ru: 'Общий рейтинг' },
  reviews:     { uz: 'Sharhlar soni',              ru: 'Кол-во отзывов' },
  price:       { uz: 'Narxlar',                    ru: 'Цены' },
  priceMin:    { uz: 'Oylik (min)',                ru: 'В месяц (мин)' },
  priceMax:    { uz: 'Oylik (max)',                ru: 'В месяц (макс)' },
  payment:     { uz: "To'lov usullari",            ru: 'Способы оплаты' },
  info:        { uz: "Ma'lumotlar",                ru: 'Информация' },
  founded:     { uz: 'Tashkil etilgan',            ru: 'Год основания' },
  students:    { uz: "O'quvchilar",                ru: 'Учеников' },
  teachers:    { uz: "O'qituvchilar",              ru: 'Преподавателей' },
  languages:   { uz: "O'qitish tillari",           ru: 'Языки обучения' },
  contact:     { uz: 'Aloqa',                      ru: 'Контакты' },
  phone:       { uz: 'Telefon',                    ru: 'Телефон' },
  telegram:    { uz: 'Telegram',                   ru: 'Telegram' },
  address:     { uz: 'Manzil',                     ru: 'Адрес' },
  verified:    { uz: 'Tasdiqlangan',               ru: 'Подтверждено' },
  reviewsUnit: { uz: 'ta sharh',                   ru: 'отзывов' },
  viewBtn:     { uz: "Batafsil ko'rish",           ru: 'Подробнее' },
  noData:      { uz: "Ma'lumot yo'q",              ru: 'Нет данных' },
}

export default function CompareContent({ institutions }: { institutions: CompareInstitution[] }) {
  const { lang } = useLang()
  const cols = institutions.length

  function Cell({ val }: { val: string | null | undefined }) {
    if (!val) return <span className="text-faint">—</span>
    return <span>{val}</span>
  }

  function SectionHeader({ labelKey }: { labelKey: keyof typeof ui }) {
    return (
      <tr>
        <td
          colSpan={cols + 1}
          className="border-t border-line bg-surface-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-mute"
        >
          {t(lang, ui[labelKey] as { uz: string; ru: string })}
        </td>
      </tr>
    )
  }

  function Row({ labelKey, values, accent }: {
    labelKey: keyof typeof ui
    values: (string | null | undefined)[]
    accent?: boolean
  }) {
    return (
      <tr className={accent ? 'bg-primary-50/30 dark:bg-primary-900/10' : ''}>
        <td className="border-t border-line px-4 py-3 text-sm font-medium text-mute">
          {t(lang, ui[labelKey] as { uz: string; ru: string })}
        </td>
        {values.map((val, i) => (
          <td key={i} className="border-t border-l border-line px-4 py-3 text-center text-sm text-ink">
            <Cell val={val} />
          </td>
        ))}
      </tr>
    )
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 pb-24">
      {/* Back */}
      <Link
        href="/search"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-mute transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t(lang, ui.back)}
      </Link>

      <h1 className="mb-6 text-2xl font-bold text-ink">
        {t(lang, ui.title)}
        <span className="ml-2 text-base font-normal tabular-nums text-faint">({cols})</span>
      </h1>

      {/* Institution header cards */}
      <div
        className="mb-6 grid gap-4"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {institutions.map((inst) => {
          const typeLabel = TYPE_LABELS[inst.type]
          const name = lang === 'ru' && inst.nameRu ? inst.nameRu : inst.nameUz
          return (
            <Link
              key={inst.id}
              href={`/institutions/${inst.slug}`}
              className="card flex flex-col items-center p-5 text-center transition-shadow hover:shadow-card-hover"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/30">
                <TypeIcon type={inst.type} className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              </div>
              <h2 className="mb-1 line-clamp-2 text-sm font-bold leading-tight text-ink">{name}</h2>
              <span className="mb-2 text-xs text-faint">
                {typeLabel ? t(lang, typeLabel) : inst.type}
              </span>
              {inst.isVerified && (
                <div className="mb-2 flex items-center gap-1 text-xs font-semibold text-accent-600 dark:text-accent-400">
                  <CheckCircle2 className="h-3 w-3" aria-hidden />
                  {t(lang, ui.verified)}
                </div>
              )}
              {inst.avgRating ? (
                <StarRating rating={inst.avgRating} size="sm" />
              ) : null}
            </Link>
          )
        })}
      </div>

      {/* Comparison table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            {/* Sticky name row */}
            <thead>
              <tr>
                <th className="border-b border-line bg-surface px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-faint" />
                {institutions.map((inst) => {
                  const name = lang === 'ru' && inst.nameRu ? inst.nameRu : inst.nameUz
                  return (
                    <th
                      key={inst.id}
                      className="border-b border-l border-line bg-surface px-4 py-3 text-center text-sm font-semibold text-ink"
                    >
                      {name}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {/* Rating */}
              <SectionHeader labelKey="rating" />
              <Row
                labelKey="avgRating"
                accent
                values={institutions.map((i) =>
                  i.avgRating ? `${i.avgRating.toFixed(1)} / 5` : null
                )}
              />
              <tr>
                <td className="border-t border-line px-4 py-3 text-sm font-medium text-mute">
                  {t(lang, ui.reviews)}
                </td>
                {institutions.map((inst) => (
                  <td key={inst.id} className="border-t border-l border-line px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <StarRating rating={inst.avgRating ?? 0} size="sm" />
                      <span className="tabular-nums text-xs text-mute">
                        {inst.reviewCount} {t(lang, ui.reviewsUnit)}
                      </span>
                    </div>
                  </td>
                ))}
              </tr>

              {/* Price */}
              <SectionHeader labelKey="price" />
              <Row
                labelKey="priceMin"
                accent
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

              {/* Info */}
              <SectionHeader labelKey="info" />
              <Row
                labelKey="founded"
                values={institutions.map((i) => i.details?.foundedYear ? String(i.details.foundedYear) : null)}
              />
              <Row
                labelKey="students"
                accent
                values={institutions.map((i) =>
                  i.details?.studentCount
                    ? i.details.studentCount.toLocaleString('uz-UZ')
                    : null
                )}
              />
              <Row
                labelKey="teachers"
                values={institutions.map((i) =>
                  i.details?.teacherCount ? String(i.details.teacherCount) : null
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

              {/* Contact */}
              <SectionHeader labelKey="contact" />
              <tr>
                <td className="border-t border-line px-4 py-3 text-sm font-medium text-mute">
                  {t(lang, ui.phone)}
                </td>
                {institutions.map((inst) => (
                  <td key={inst.id} className="border-t border-l border-line px-4 py-3 text-center text-sm">
                    {inst.phone ? (
                      <a
                        href={`tel:${inst.phone}`}
                        className="inline-flex items-center gap-1.5 font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                      >
                        <Phone className="h-3.5 w-3.5" aria-hidden />
                        {inst.phone}
                      </a>
                    ) : <span className="text-faint">—</span>}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="border-t border-line bg-primary-50/30 px-4 py-3 text-sm font-medium text-mute dark:bg-primary-900/10">
                  {t(lang, ui.telegram)}
                </td>
                {institutions.map((inst) => (
                  <td key={inst.id} className="border-t border-l border-line bg-primary-50/30 px-4 py-3 text-center text-sm dark:bg-primary-900/10">
                    {inst.telegram ? (
                      <a
                        href={`https://t.me/${inst.telegram}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                      >
                        <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                        @{inst.telegram}
                      </a>
                    ) : <span className="text-faint">—</span>}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="border-t border-line px-4 py-3 text-sm font-medium text-mute">
                  {t(lang, ui.address)}
                </td>
                {institutions.map((inst) => (
                  <td key={inst.id} className="border-t border-l border-line px-4 py-3 text-center text-sm text-ink">
                    {inst.address ? (
                      <span className="inline-flex items-start gap-1.5">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mute" aria-hidden />
                        {inst.address}
                      </span>
                    ) : <span className="text-faint">—</span>}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
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
              className="btn-primary flex items-center justify-center gap-2"
            >
              <Star className="h-4 w-4" aria-hidden />
              <span className="truncate">{name}</span>
            </Link>
          )
        })}
      </div>
    </main>
  )
}
