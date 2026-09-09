import { notFound } from 'next/navigation'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import CompareContent from './CompareContent'
import CompareEmpty from './CompareEmpty'
import CompareError from './CompareError'
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
  website?: string
  lat?: number
  lng?: number
  details?: {
    foundedYear?: number
    studentCount?: number
    teacherCount?: number
    languages?: string[]
    shifts?: string[]
    shiftsRu?: string[]
  }
  pricing?: {
    monthlyMin?: number
    monthlyMax?: number
    paymentMethods?: string[]
  }
  accreditations?: { id: string; name: string; issuedBy?: string | null }[]
  _count?: { branches: number }
}

// Avval fetch xatosi ham, haqiqatan ham topilmagan/kam id ham bir xil `[]`
// bilan qaytardi — page komponenti ikkalasini ham notFound() (404) deb
// ko'rsatardi, ya'ni "server ishlamayapti" bilan "bunday solishtirish
// mavjud emas"ni ajratib bo'lmasdi (UX audit topilmasi). Endi ikkalasi
// alohida natija sifatida qaytariladi.
type CompareDataResult =
  | { ok: true; data: CompareInstitution[] }
  | { ok: false }

async function getCompareData(ids: string[]): Promise<CompareDataResult> {
  if (ids.length < 2) return { ok: true, data: [] }
  try {
    const res = await fetch(`${API}/institutions/compare?ids=${ids.join(',')}`, {
      next: { revalidate: 60 },
      headers: { 'ngrok-skip-browser-warning': '1' },
    })
    if (!res.ok) return { ok: false }
    const { data } = await res.json()
    return { ok: true, data: data as CompareInstitution[] }
  } catch {
    return { ok: false }
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
        <div className="no-print"><Footer /></div>
      </>
    )
  }

  const result = await getCompareData(ids)
  if (!result.ok) {
    return (
      <>
        <div className="no-print"><Header /></div>
        <CompareError />
        <div className="no-print"><Footer /></div>
      </>
    )
  }
  if (result.data.length < 2) notFound()

  return (
    <>
      <div className="no-print"><Header /></div>
      <CompareContent institutions={result.data} />
      <div className="no-print"><Footer /></div>
    </>
  )
}
