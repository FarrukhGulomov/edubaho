import type { Metadata } from 'next'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import SearchResults from './SearchResults'

export const metadata: Metadata = {
  title: "Qidiruv — Ta'lim muassasalarini toping",
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const params = await searchParams
  const query = new URLSearchParams(params).toString()

  let institutions: InstitutionCard[] = []
  let meta = { total: 0, page: 1, limit: 20, totalPages: 0 }

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/institutions?${query}`,
      { cache: 'no-store' },
    )
    if (res.ok) {
      const data = await res.json()
      institutions = data.data
      meta = data.meta
    }
  } catch {
    // API ishlamasa bo'sh
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <SearchResults institutions={institutions} meta={meta} params={params} />
      <Footer />
    </div>
  )
}

export interface InstitutionCard {
  id: string
  nameUz: string
  nameRu?: string
  slug: string
  type: string
  status: string
  avgRating?: number
  reviewCount: number
  isVerified: boolean
  address?: string
  telegram?: string
  media?: { url: string; thumbnailUrl?: string | null }[]
  city?:   { id: string; nameUz: string; nameRu?: string }
  region?: { id: string; nameUz: string; nameRu?: string }
  pricing?: { monthlyMin?: number }
  details?: {
    studentCount?:   number | null
    teacherCount?:   number | null
    foundedYear?:    number | null
    programs?:       string[]
  }
}
