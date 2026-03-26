import { notFound } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import CompareContent from './CompareContent'

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
  const ids = (params.ids ?? '').split(',').filter(Boolean).slice(0, 3)

  if (ids.length < 2) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-20 text-center">
          <div className="text-6xl mb-4">⇄</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Kamida 2 ta muassasa tanlang
          </h1>
          <p className="text-gray-500 mb-2">
            Минимум 2 учреждения для сравнения
          </p>
          <p className="text-sm text-gray-400 mb-8">
            Qidiruv sahifasida muassasalar yonidagi &quot;Solishtir&quot; tugmasini bosing
          </p>
          <Link
            href="/search"
            className="inline-block rounded-2xl bg-primary-600 px-8 py-4 font-bold text-white hover:bg-primary-700 transition-colors"
          >
            Muassasalarni ko&apos;rish
          </Link>
        </main>
      </>
    )
  }

  const institutions = await getCompareData(ids)
  if (institutions.length < 2) notFound()

  return (
    <>
      <Header />
      <CompareContent institutions={institutions} />
    </>
  )
}
