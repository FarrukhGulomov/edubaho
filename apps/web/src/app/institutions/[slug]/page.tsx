import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Header from '@/components/shared/Header'
import InstitutionDetail from './InstitutionDetail'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

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
  return {
    title: inst.nameUz,
    description: inst.details?.descriptionUz?.slice(0, 160),
    openGraph: { title: inst.nameUz, type: 'website' },
  }
}

type Props = { params: Promise<{ slug: string }> }

export default async function InstitutionPage({ params }: Props) {
  const { slug } = await params
  const inst = await getInstitution(slug)
  if (!inst) notFound()

  return (
    <>
      <Header />
      <InstitutionDetail inst={inst} />
    </>
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
  isVerified: boolean
  avgRating?: number
  reviewCount: number
  subscription?: { plan: string }
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
  }>
}
