import { notFound } from 'next/navigation'
import Header from '@/components/shared/Header'
import CompareContent from './CompareContent'
import CompareEmpty from './CompareEmpty'
import { MAX_COMPARE } from '@/lib/compareConstants'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

interface CompareInstitution {
  id: string
  nameUz: string
  nameRu?: string
  slug: string
  type: string
  isVerified: boolean
  avgRating?: number
  reviewCount: number
  viewCount: number
  createdAt: string
  address?: string
  phone?: string
  telegram?: string
  details?: {
    foundedYear?: number
    studentCount?: number
    teacherCount?: number
    languages?: string[]
    shifts?: string[]
  }
  pricing?: {
    monthlyMin?: number
    monthlyMax?: number
    paymentMethods?: string[]
  }
  accreditations?: { id: string; name: string; issuedBy?: string | null }[]
  _count?: { branches: number }
}

async function getCompareData(ids: string[]): Promise<CompareInstitution[]> {
  if (ids.length < 2) return []
  try {
    const res = await fetch(`${API}/institutions/compare?ids=${ids.join(',')}`, {
      next: { revalidate: 60 },
      headers: { 'ngrok-skip-browser-warning': '1' },
    })
    if (!res.ok) return []
    const { data } = await res.json()
    return data as CompareInstitution[]
  } catch {
    return []
  }
}

type Props = { searchParams: Promise<Record<string, string>> }

export default async function ComparePage({ searchParams }: Props) {
  const params = await searchParams
  const ids = (params.ids ?? '').split(',').filter(Boolean).slice(0, MAX_COMPARE)

  if (ids.length < 2) {
    return (
      <>
        <div className="no-print"><Header /></div>
        <CompareEmpty />
      </>
    )
  }

  const institutions = await getCompareData(ids)
  if (institutions.length < 2) notFound()

  return (
    <>
      <div className="no-print"><Header /></div>
      <CompareContent institutions={institutions} />
    </>
  )
}
