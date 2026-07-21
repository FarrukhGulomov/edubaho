'use client'

import Link from 'next/link'
import { Ban, GraduationCap, PencilLine, AlertCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import InstitutionForm from '@/components/admin/InstitutionForm'
import type { InstitutionFormData } from '@/components/admin/InstitutionForm'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

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
          monthlyMin:    inst.pricing?.monthlyMin    ? String(inst.pricing.monthlyMin) : '',
          monthlyMax:    inst.pricing?.monthlyMax    ? String(inst.pricing.monthlyMax) : '',
          paymentMethods: inst.pricing?.paymentMethods ?? [],
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
              <GraduationCap className="h-4 w-4 shrink-0" strokeWidth={1.75} /> EDULA
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
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <InstitutionForm
              mode="edit"
              institutionId={id}
              initialData={initialData}
            />
          </div>
        )}
      </main>
    </div>
  )
}
