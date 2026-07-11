'use client'

import Link from 'next/link'
import {
  ArrowLeft, Star, Wallet, Info, Phone, Laptop, GraduationCap, School,
  Palette, Globe2, PencilLine, Dumbbell, Trophy, Landmark, UserCheck,
  BadgeCheck,
} from 'lucide-react'
import { RatingHint } from '@/components/shared/StarRating'
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

const TYPE_ICONS: Record<string, typeof School> = {
  IT_SCHOOL: Laptop, UNIVERSITY: GraduationCap, SCHOOL: School, KINDERGARTEN: Palette,
  LANGUAGE_CENTER: Globe2, COURSE_CENTER: PencilLine, SPORTS_SCHOOL: Dumbbell, LYCEUM: Trophy,
  COLLEGE: Landmark, TUTORING: UserCheck, ARTS_SCHOOL: Palette,
}

export default function CompareContent({ institutions }: { institutions: CompareInstitution[] }) {
  const { lang } = useLang()
  const cols = institutions.length

  const ui = {
    title:      { uz: 'Muassasalarni solishtirish', ru: 'Сравнение учреждений' },
    back:       { uz: 'Qidiruvga qaytish',          ru: 'Вернуться к поиску' },
    rating:     { uz: 'Reyting va sharhlar',        ru: 'Рейтинг и отзывы' },
    avgRating:  { uz: 'Umumiy reyting',             ru: 'Общий рейтинг' },
    reviews:    { uz: 'Sharhlar soni',              ru: 'Кол-во отзывов' },
    price:      { uz: 'Narxlar',                    ru: 'Цены' },
    priceMin:   { uz: 'Oylik narx (min)',           ru: 'Ежемес. цена (мин)' },
    priceMax:   { uz: 'Oylik narx (max)',           ru: 'Ежемес. цена (макс)' },
    payment:    { uz: "To'lov usullari",            ru: 'Способы оплаты' },
    info:       { uz: "Ma'lumotlar",                ru: 'Информация' },
    founded:    { uz: 'Tashkil etilgan',            ru: 'Год основания' },
    students:   { uz: "O'quvchilar",                ru: 'Учеников' },
    teachers:   { uz: "O'qituvchilar",              ru: 'Преподавателей' },
    languages:  { uz: "O'qitish tillari",           ru: 'Языки обучения' },
    contact:    { uz: 'Aloqa',                      ru: 'Контакты' },
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

  function SectionHeader({ labelKey, Icon }: { labelKey: keyof typeof ui; Icon: typeof Star }) {
    return (
      <tr className="bg-primary-600">
        <td className="border border-primary-500 px-4 py-2.5 text-sm font-semibold text-white" colSpan={cols + 1}>
          <span className="flex items-center gap-2 whitespace-nowrap">
            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {t(lang, ui[labelKey] as { uz: string; ru: string })}
          </span>
        </td>
      </tr>
    )
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 pb-24">
      <div className="mb-6 flex items-center gap-1.5 text-sm text-gray-500">
        <Link href="/search" className="flex items-center gap-1.5 hover:text-primary-600">
          <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={1.75} /> {t(lang, ui.back)}
        </Link>
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
          const TypeIcon = TYPE_ICONS[inst.type] ?? School
          return (
            <Link
              key={inst.id}
              href={`/institutions/${inst.slug}`}
              className="card rounded-2xl p-5 text-center hover:border-primary-300"
            >
              <div className="mb-2 flex justify-center">
                <TypeIcon className="h-9 w-9 text-primary-300" strokeWidth={1.5} />
              </div>
              <h2 className="mb-1 line-clamp-2 font-semibold leading-tight text-gray-900">{name}</h2>
              <span className="text-xs text-gray-400">
                {typeLabel ? t(lang, typeLabel) : inst.type}
              </span>
              {inst.isVerified && (
                <div className="mt-2 flex items-center justify-center gap-1 text-xs font-semibold text-emerald-600">
                  <BadgeCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {t(lang, ui.verified)}
                </div>
              )}
              {inst.avgRating && (
                <div className="mt-2 flex justify-center">
                  <RatingHint rating={inst.avgRating} lang={lang} />
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
            {/* Narx — solishtirishda ASOSIY parametr (reyting emas) */}
            <SectionHeader labelKey="price" Icon={Wallet} />
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

            <SectionHeader labelKey="info" Icon={Info} />
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

            {/* Reyting — jadvalning pastki qismida, ataylab highlight'siz:
                baholar foydalanuvchilar tomonidan qo'yilgan taxminiy
                ko'rsatkich, asosiy solishtirish parametri emas */}
            <SectionHeader labelKey="rating" Icon={Star} />
            <Row
              labelKey="avgRating"
              values={institutions.map((i) =>
                i.avgRating ? `${i.avgRating.toFixed(1)} / 5` : null
              )}
            />
            <Row
              labelKey="reviews"
              values={institutions.map((i) =>
                `${i.reviewCount} ${t(lang, ui.reviewsUnit)}`
              )}
            />

            <SectionHeader labelKey="contact" Icon={Phone} />
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
