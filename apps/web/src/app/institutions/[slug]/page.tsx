import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import InstitutionDetail from './InstitutionDetail'
import { institutionSchema, breadcrumbSchema, safeJsonLd } from '@/lib/structuredData'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bilimon.uz'

const TYPE_LABELS_UZ: Record<string, string> = {
  KINDERGARTEN: "bog'cha", SCHOOL: 'maktab', LYCEUM: 'litsey', COLLEGE: 'kollej',
  UNIVERSITY: 'universitet', COURSE_CENTER: "o'quv markaz", LANGUAGE_CENTER: 'til markazi',
  IT_SCHOOL: 'IT maktab', TUTORING: 'repetitor', SPORTS_SCHOOL: 'sport maktabi', ARTS_SCHOOL: "san'at maktabi",
}

async function getInstitution(slug: string) {
  const res = await fetch(`${API}/institutions/${slug}`, {
    next: { revalidate: 120 },
    headers: { 'ngrok-skip-browser-warning': '1' },
  })
  if (!res.ok) return null
  const { data } = await res.json()
  return data as Institution
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const inst = await getInstitution(slug)
  if (!inst) return { title: 'Topilmadi' }

  const typeLabel = TYPE_LABELS_UZ[inst.type] ?? "ta'lim muassasasi"
  const cityPart = inst.city?.nameUz ? ` — ${inst.city.nameUz}` : ''
  const title = `${inst.nameUz}${cityPart} | narxi, sharhlar`
  // descriptionUz to'ldirilmagan bo'lsa ham meta description HECH QACHON
  // bo'sh qolmasin — qidiruv natijasida snippet ko'rinishi uchun muhim
  const description = inst.details?.descriptionUz?.slice(0, 160)
    ?? `${inst.nameUz} — ${typeLabel}${inst.city?.nameUz ? ` (${inst.city.nameUz})` : ''}. ` +
       `${inst.avgRating ? `Reyting: ${inst.avgRating.toFixed(1)}/5, ` : ''}` +
       `${inst.reviewCount} ta sharh. Narxlar, aloqa va batafsil ma'lumot BilimOn'da.`
  const url = `${SITE_URL}/institutions/${inst.slug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title, description, url, type: 'website', siteName: 'BilimOn',
    },
    twitter: { card: 'summary', title, description },
  }
}

type Props = { params: Promise<{ slug: string }> }

export default async function InstitutionPage({ params }: Props) {
  const { slug } = await params
  const inst = await getInstitution(slug)
  if (!inst) notFound()

  const jsonLd = [
    institutionSchema(inst),
    breadcrumbSchema([
      { name: 'BilimOn', url: SITE_URL },
      { name: inst.nameUz, url: `${SITE_URL}/institutions/${inst.slug}` },
    ]),
  ]

  return (
    <div className="flex min-h-screen flex-col">
      {jsonLd.map((schema, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger -- safeJsonLd `<` belgisini escape qiladi, script breakout xavfi yo'q
          dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
        />
      ))}
      <Header />
      <InstitutionDetail inst={inst} />
      <Footer />
    </div>
  )
}

// ─── Types ───────────────────────────────────────────────────

export interface Institution {
  id: string
  nameUz: string
  nameRu?: string
  slug: string
  type: string
  status: string
  phone?: string
  phone2?: string
  email?: string
  website?: string
  telegram?: string
  instagram?: string
  address?: string
  lat?: number
  lng?: number
  isVerified: boolean
  verificationLevel: 'UNVERIFIED' | 'CLAIMED' | 'VERIFIED'
  trialLessonEnabled?: boolean
  deliveryMode?: string
  avgRating?: number
  reviewCount: number
  city?: { id?: string; nameUz: string; nameRu?: string | null } | null
  media?: Array<{ id: string; url: string; thumbnailUrl?: string | null; type: string; caption?: string | null }>
  // Filiallar — bir xil muassasaning boshqa shaharlardagi bo'limlari
  branches?: Array<{
    id: string
    nameUz?: string | null
    nameRu?: string | null
    address?: string | null
    phone?: string | null
    isMain: boolean
    city: { id: string; nameUz: string; nameRu?: string | null }
  }>
  subscription?: { plan: string }
  // Litsenziya/rasmiy hujjatlar — mavjud bo'lsa profilida qo'shimcha
  // ishonch belgisi sifatida ko'rsatiladi (VerificationLevel'dan mustaqil)
  accreditations?: Array<{ id: string; name: string; issuedBy?: string | null }>
  details?: {
    descriptionUz?: string
    descriptionRu?: string
    foundedYear?: number
    studentCount?: number
    teacherCount?: number
    languages?: string[]
    programs?: string[]
    specializations?: string[]
    achievements?: string
    shifts?: string[]
  }
  pricing?: {
    monthlyMin?: number
    monthlyMax?: number
    paymentMethods?: string[]
  }
  reviews?: Array<{
    id: string
    overallRating: number
    teacherRating?: number | null
    facilityRating?: number | null
    valueRating?: number | null
    serviceRating?: number | null
    atmosphereRating?: number | null
    title?: string
    body: string
    isAnonymous: boolean
    helpfulCount: number
    createdAt?: string
    user?: { name?: string }
    outcomeText?: string | null
    isVerified?: boolean
  }>
}
