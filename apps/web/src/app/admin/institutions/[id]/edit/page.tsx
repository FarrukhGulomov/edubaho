'use client'

import Link from 'next/link'
import { Ban, PencilLine, AlertCircle, GitMerge, Search, X } from 'lucide-react'
import BrandMark from '@/components/shared/BrandMark'
import { useAuth } from '@/hooks/useAuth'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import InstitutionForm from '@/components/admin/InstitutionForm'
import type { InstitutionFormData } from '@/components/admin/InstitutionForm'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

interface InstitutionSearchResult {
  id: string
  nameUz: string
  nameRu: string | null
  slug: string
  type: string
  city: { nameUz: string } | null
}

/**
 * "Birlashtirish" — bir xil muassasa xato bilan (yoki filiallar hali
 * qo'llab-quvvatlanmasdan oldin) alohida-alohida yozuv sifatida
 * qo'shilgan bo'lsa (masalan "PDP Academy" Buxoro uchun ham alohida),
 * shu joriy yozuvni boshqa (asosiy) muassasaga FILIAL sifatida
 * birlashtiradi va o'zini o'chiradi.
 */
function MergePanel({ id, instName }: { id: string; instName: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<InstitutionSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [target, setTarget] = useState<InstitutionSearchResult | null>(null)
  const [merging, setMerging] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const query = q.trim()
    if (query.length < 2) { setResults([]); return }
    setSearching(true)
    const token = localStorage.getItem('accessToken')
    const timer = setTimeout(() => {
      fetch(`${API}/admin/institutions/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' },
      })
        .then((r) => r.json())
        .then((d) => setResults((d.data ?? []).filter((r: InstitutionSearchResult) => r.id !== id)))
        .catch(() => {})
        .finally(() => setSearching(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [q, id])

  async function handleMerge() {
    if (!target) return
    if (!confirm(
      `"${instName}" muassasasi "${target.nameUz}" ga FILIAL sifatida birlashtiriladi va o'zi o'chiriladi. ` +
      `Bu amalni ortga qaytarib bo'lmaydi. Davom etasizmi?`,
    )) return

    setMerging(true)
    setError('')
    const token = localStorage.getItem('accessToken')
    try {
      const res = await fetch(`${API}/admin/institutions/${id}/merge-into`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'ngrok-skip-browser-warning': '1',
        },
        body: JSON.stringify({ targetId: target.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Xatolik')
      router.push('/admin/institutions')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Birlashtirishda xatolik yuz berdi')
      setMerging(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-gray-400 transition-colors hover:text-amber-600"
      >
        <GitMerge className="h-4 w-4 shrink-0" strokeWidth={1.75} /> Bu takroriy yozuvmi? Boshqa muassasaga birlashtirish
      </button>
    )
  }

  return (
    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-800">
          <GitMerge className="h-4 w-4 shrink-0" strokeWidth={1.75} /> Filialga aylantirish / Birlashtirish
        </p>
        <button type="button" onClick={() => setOpen(false)} className="text-amber-400 hover:text-amber-600">
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
      <p className="mb-3 text-xs text-amber-700">
        Agar &quot;{instName}&quot; aslida boshqa muassasaning (masalan boshqa shahardagi filialining) takroriy
        yozuvi bo&apos;lsa — quyidan asosiy muassasani toping. &quot;{instName}&quot; shu muassasaga filial
        sifatida qo&apos;shiladi va joriy yozuv sifatida o&apos;chiriladi (sharhlari, saqlanganlari va h.k. asosiy
        muassasaga ko&apos;chiriladi).
      </p>

      {!target ? (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={1.75} />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Asosiy muassasa nomini yozing..."
            className="w-full rounded-xl border border-amber-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-amber-400"
          />
          {searching && <p className="mt-1.5 text-xs text-gray-400">Qidirilmoqda...</p>}
          {results.length > 0 && (
            <div className="mt-2 space-y-1 rounded-xl border border-amber-200 bg-white p-1.5">
              {results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => { setTarget(r); setResults([]); setQ('') }}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-amber-50"
                >
                  <span className="truncate font-medium text-gray-800">{r.nameUz}</span>
                  {r.city && <span className="shrink-0 text-xs text-gray-400">{r.city.nameUz}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-white px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-800">{target.nameUz}</p>
            {target.city && <p className="text-xs text-gray-400">{target.city.nameUz}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => setTarget(null)} className="text-xs font-semibold text-gray-500 hover:text-gray-700">
              Bekor qilish
            </button>
            <button
              type="button"
              onClick={handleMerge}
              disabled={merging}
              className="whitespace-nowrap rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
            >
              {merging ? 'Birlashtirilmoqda...' : 'Birlashtirish'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {error}
        </p>
      )}
    </div>
  )
}

export default function EditInstitutionPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [initialData, setInitialData] = useState<Partial<InstitutionFormData> | null>(null)
  const [instName, setInstName] = useState('')
  const [fetchError, setFetchError] = useState('')

  useEffect(() => {
    if (!user || !id) return
    const token = localStorage.getItem('accessToken')
    if (!token) return

    fetch(`${API}/admin/institutions/${id}`, {
      headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setFetchError(d.error); return }
        const inst = d.data
        setInstName(inst.nameUz)
        // API javobini form formatiga moslashtirish
        setInitialData({
          nameUz:        inst.nameUz        ?? '',
          nameRu:        inst.nameRu        ?? '',
          slug:          inst.slug          ?? '',
          type:          inst.type          ?? 'IT_SCHOOL',
          status:        inst.status        ?? 'PENDING',
          isVerified:    inst.isVerified    ?? false,
          trialLessonEnabled: inst.trialLessonEnabled ?? false,
          deliveryMode:  inst.deliveryMode  ?? 'OFFLINE',
          phone:         inst.phone         ?? '',
          phone2:        inst.phone2        ?? '',
          email:         inst.email         ?? '',
          website:       inst.website       ?? '',
          telegram:      inst.telegram      ?? '',
          instagram:     inst.instagram     ?? '',
          address:       inst.address       ?? '',
          descriptionUz: inst.details?.descriptionUz ?? '',
          descriptionRu: inst.details?.descriptionRu ?? '',
          foundedYear:   inst.details?.foundedYear   ? String(inst.details.foundedYear) : '',
          studentCount:  inst.details?.studentCount  ? String(inst.details.studentCount) : '',
          teacherCount:  inst.details?.teacherCount  ? String(inst.details.teacherCount) : '',
          languages:       inst.details?.languages        ?? [],
          programs:        inst.details?.programs?.join(', ')        ?? '',
          specializations: inst.details?.specializations?.join(', ') ?? '',
          shifts:          inst.details?.shifts            ?? [],
          achievements:    inst.details?.achievements      ?? '',
          categories:      inst.details?.categories        ?? [],
          monthlyMin:    inst.pricing?.monthlyMin    ? String(inst.pricing.monthlyMin) : '',
          monthlyMax:    inst.pricing?.monthlyMax    ? String(inst.pricing.monthlyMax) : '',
          paymentMethods: inst.pricing?.paymentMethods ?? [],
          branches: (inst.branches ?? []).map((b: {
            id: string; nameUz: string | null; nameRu: string | null
            address: string | null; phone: string | null; isMain: boolean
            city: { id: string }
          }) => ({
            id: b.id,
            nameUz: b.nameUz ?? '',
            nameRu: b.nameRu ?? '',
            cityId: b.city.id,
            address: b.address ?? '',
            phone: b.phone ?? '',
            isMain: b.isMain,
          })),
        })
      })
      .catch(() => setFetchError('Ma\'lumotlarni yuklab bo\'lmadi'))
  }, [user, id])

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth')
  }, [authLoading, user, router])

  if (authLoading || !user) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
    </div>
  )

  if (user.role !== 'ADMIN' && user.role !== 'MODERATOR' && user.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-center px-4">
        <div>
          <div className="mb-4 flex justify-center">
            <Ban className="h-12 w-12 text-gray-300" strokeWidth={1.5} />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Ruxsat yo&apos;q</h1>
          <Link href="/" className="text-primary-600 hover:underline">Bosh sahifaga qaytish</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3 overflow-hidden text-sm">
            <Link href="/" className="flex shrink-0 items-center gap-1.5 whitespace-nowrap font-bold text-primary-600">
              <BrandMark size={16} className="shrink-0" /> BilimOn
            </Link>
            <span className="shrink-0 text-gray-300">›</span>
            <Link href="/admin/institutions" className="shrink-0 whitespace-nowrap text-gray-500 hover:text-gray-700">Muassasalar</Link>
            <span className="shrink-0 text-gray-300">›</span>
            <span className="max-w-32 truncate font-semibold text-gray-700">{instName || 'Tahrirlash'}</span>
          </div>
          <Link
            href="/admin/institutions"
            className="shrink-0 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
          >
            ← Orqaga
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <PencilLine className="h-6 w-6 shrink-0 text-primary-600" strokeWidth={1.75} />
            {instName ? `"${instName}"ni tahrirlash` : 'Tahrirlash'}
          </h1>
          <p className="mt-1 text-gray-500">Ma'lumotlarni o'zgartirib, saqlash tugmasini bosing</p>
        </div>

        {fetchError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <div className="mb-3 flex justify-center">
              <AlertCircle className="h-9 w-9 text-red-400" strokeWidth={1.5} />
            </div>
            <p className="font-semibold text-red-700">{fetchError}</p>
            <Link
              href="/admin/institutions"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-6 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:border-red-300 hover:bg-red-50"
            >
              ← Orqaga qaytish
            </Link>
          </div>
        ) : !initialData ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <InstitutionForm
                mode="edit"
                institutionId={id}
                initialData={initialData}
              />
            </div>
            <MergePanel id={id} instName={instName} />
          </>
        )}
      </main>
    </div>
  )
}
