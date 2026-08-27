'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { authApi } from '@/lib/api'
import {
  ClipboardList, Phone, Info, Wallet, AlertCircle, BookOpen, Target,
  Clock, Trophy, ChevronLeft, ChevronRight, CheckCircle2, CalendarCheck, ChevronDown,
  Search, MapPin, Star, Sparkles, Building2, Plus, X, Images, Upload,
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

const INSTITUTION_TYPES = [
  { value: 'IT_SCHOOL',       label: 'IT maktab' },
  { value: 'UNIVERSITY',      label: 'Universitet' },
  { value: 'SCHOOL',          label: 'Maktab' },
  { value: 'KINDERGARTEN',    label: "Bog'cha" },
  { value: 'LANGUAGE_CENTER', label: 'Til markazi' },
  { value: 'COURSE_CENTER',   label: "O'quv markaz" },
  { value: 'SPORTS_SCHOOL',   label: 'Sport maktabi' },
  { value: 'LYCEUM',          label: 'Litsey' },
  { value: 'COLLEGE',         label: 'Kollej' },
  { value: 'TUTORING',        label: 'Repetitor' },
  { value: 'ARTS_SCHOOL',     label: "San'at maktabi" },
]

const STATUSES = [
  { value: 'PENDING',   label: 'Kutilmoqda' },
  { value: 'ACTIVE',    label: 'Faol' },
  { value: 'PREMIUM',   label: 'Premium' },
  { value: 'SUSPENDED', label: 'To\'xtatilgan' },
  { value: 'INACTIVE',  label: 'Nofaol' },
]

const DELIVERY_MODES = [
  { value: 'OFFLINE', label: 'Offlayn' },
  { value: 'ONLINE',  label: 'Onlayn' },
  { value: 'HYBRID',  label: 'Gibrid (ikkalasi ham)' },
]

// EduFit Ta'lim profili — moslik algoritmida QATTIQ filtr sifatida
// ishlatiladi (masalan "OTMga kirish" so'ralganda shu belgi yo'q
// muassasa umuman tavsiya qilinmaydi). apps/api/src/utils/educationCategories.ts
// bilan bir xil kodlar — o'zgartirilsa ikkalasida ham yangilanishi kerak.
const EDUCATION_CATEGORIES = [
  { value: 'UNIVERSITY_PREP', label: 'OTMga kirish tayyorlov' },
  { value: 'IELTS', label: 'IELTS' },
  { value: 'SAT', label: 'SAT' },
  { value: 'CEFR', label: 'CEFR / TOEFL' },
  { value: 'SCHOOL_SUBJECTS', label: 'Maktab fanlari' },
  { value: 'IT_COURSES', label: 'IT kurslari' },
  { value: 'PROGRAMMING', label: 'Dasturlash' },
  { value: 'DESIGN', label: 'Dizayn' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'ACCOUNTING', label: 'Buxgalteriya' },
  { value: 'LANGUAGES', label: 'Chet tillari' },
  { value: 'KIDS_EDUCATION', label: "Bolalar ta'limi" },
  { value: 'PROFESSIONAL_CERTIFICATION', label: 'Kasbiy sertifikatlash' },
  { value: 'CAREER_CHANGE', label: 'Kasb almashtirish' },
]

interface CityOption {
  id: string
  nameUz: string
  nameRu: string
}

// Bitta muassasaning boshqa shahardagi filiali — masalan "PDP Academy"
// Toshkentda ro'yxatdan o'tgan bo'lsa-yu, Buxoro/Farg'onada ham filiali
// bo'lsa, ULARNI ALOHIDA muassasa sifatida EMAS, shu ro'yxatga qo'shing
// (bir xil muassasa nomi ikki marta yaratilishi endi taqiqlangan).
export interface BranchFormData {
  id?: string
  nameUz: string
  nameRu: string
  cityId: string
  address: string
  phone: string
  isMain: boolean
}

const EMPTY_BRANCH: BranchFormData = { nameUz: '', nameRu: '', cityId: '', address: '', phone: '', isMain: false }

interface PlaceSearchResult {
  placeId: string
  name: string
  address: string
  lat: number | null
  lng: number | null
  rating: number | null
  userRatingsTotal: number | null
}

interface PlaceDetails extends PlaceSearchResult {
  phone: string | null
  website: string | null
}

const PAYMENT_METHODS = ['Payme', 'Click', 'Uzcard', 'Humo', 'Naqd']
const LANGUAGES = ['uz', 'ru', 'en', 'de', 'fr', 'ko', 'zh']
const SHIFTS = ['Ertalabki (08:00-13:00)', 'Tushki (13:00-18:00)', 'Kechki (18:00-22:00)', 'Hafta oxiri', 'Online']

export interface InstitutionFormData {
  nameUz: string
  nameRu: string
  slug: string
  type: string
  /** Ko'rgazmali qo'shimcha teglar — qidiruv/moslik algoritmiga ta'sir qilmaydi */
  additionalTypes: string[]
  status: string
  isVerified: boolean
  trialLessonEnabled: boolean
  deliveryMode: string
  phone: string
  phone2: string
  email: string
  website: string
  telegram: string
  instagram: string
  address: string
  lat: string
  lng: string
  descriptionUz: string
  descriptionRu: string
  foundedYear: string
  studentCount: string
  teacherCount: string
  languages: string[]
  programs: string        // vergul bilan ajratilgan
  specializations: string // vergul bilan ajratilgan
  shifts: string[]
  achievements: string
  categories: string[]
  monthlyMin: string
  monthlyMax: string
  paymentMethods: string[]
  branches: BranchFormData[]
}

const EMPTY: InstitutionFormData = {
  nameUz: '', nameRu: '', slug: '', type: 'IT_SCHOOL', additionalTypes: [], status: 'PENDING',
  isVerified: false, trialLessonEnabled: false, deliveryMode: 'OFFLINE', phone: '', phone2: '', email: '', website: '',
  telegram: '', instagram: '', address: '', lat: '', lng: '',
  descriptionUz: '', descriptionRu: '',
  foundedYear: '', studentCount: '', teacherCount: '',
  languages: [], programs: '', specializations: '', shifts: [], achievements: '',
  categories: [],
  monthlyMin: '', monthlyMax: '', paymentMethods: [],
  branches: [],
}

const BASE_TABS = [
  { id: 'main',     label: 'Asosiy',    Icon: ClipboardList },
  { id: 'contact',  label: 'Aloqa',     Icon: Phone },
  { id: 'details',  label: 'Batafsil',  Icon: Info },
  { id: 'branches', label: 'Filiallar', Icon: Building2 },
  { id: 'pricing',  label: 'Narx',      Icon: Wallet },
]
// Rasmlar bo'limi faqat tahrirlashda ko'rinadi — rasm yuklash uchun
// muassasa avval saqlangan (ID mavjud) bo'lishi kerak
const EDIT_ONLY_TABS = [
  { id: 'photos', label: 'Rasmlar', Icon: Images },
]

export interface PhotoData {
  id: string
  url: string
  thumbnailUrl: string | null
}

interface Props {
  initialData?: Partial<InstitutionFormData>
  institutionId?: string   // set when editing
  mode: 'create' | 'edit'
  initialPhotos?: PhotoData[]
}

export default function InstitutionForm({ initialData, institutionId, mode, initialPhotos }: Props) {
  const router = useRouter()
  const TABS = mode === 'edit' ? [...BASE_TABS, ...EDIT_ONLY_TABS] : BASE_TABS
  const [tab, setTab] = useState('main')
  const [form, setForm] = useState<InstitutionFormData>({ ...EMPTY, ...initialData })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Rasmlar — alohida endpoint orqali boshqariladi (institution.create/update
  // JSON tanasidan mustaqil, chunki fayl yuklash multipart/form-data talab qiladi)
  const [photos, setPhotos] = useState<PhotoData[]>(initialPhotos ?? [])
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState('')

  // Admin Import Yordamchisi (Google Places) — faqat yangi muassasa
  // qo'shishda, nom/manzil/koordinata/telefonni qo'lda kiritish o'rniga
  // qidirib topish uchun. Hech narsa avtomatik saqlanmaydi — admin
  // natijani tanlagach forma maydonlariga ko'chiriladi, o'zi tahrirlab
  // saqlaydi (Google Maps shartlariga ko'ra doimiy avtomatik import taqiqlangan).
  const [placesQuery, setPlacesQuery] = useState('')
  const [placesResults, setPlacesResults] = useState<PlaceSearchResult[]>([])
  const [placesLoading, setPlacesLoading] = useState(false)
  const [placesError, setPlacesError] = useState('')
  const [imported, setImported] = useState(false)

  // Filiallar bo'limida shahar tanlash uchun
  const [cities, setCities] = useState<CityOption[]>([])
  useEffect(() => {
    fetch(`${API}/geo/cities`)
      .then((r) => r.json())
      .then((d) => setCities(d.data ?? []))
      .catch(() => {})
  }, [])

  function set(field: keyof InstitutionFormData, value: string | boolean | string[] | BranchFormData[]) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  /** Asosiy "Tur" o'zgarsa — yangi qiymat qo'shimcha turlar ro'yxatida
   * qolib ketmasligi uchun (ikkalasida ham bir xil bo'lmasligi kerak) */
  function setType(v: string) {
    setForm((prev) => ({ ...prev, type: v, additionalTypes: prev.additionalTypes.filter((t) => t !== v) }))
  }

  function addBranch() {
    set('branches', [...form.branches, { ...EMPTY_BRANCH }])
  }
  function updateBranch(index: number, patch: Partial<BranchFormData>) {
    set('branches', form.branches.map((b, i) => (i === index ? { ...b, ...patch } : b)))
  }
  function removeBranch(index: number) {
    set('branches', form.branches.filter((_, i) => i !== index))
  }

  async function handlePhotoUpload(files: FileList | null) {
    if (!files || files.length === 0 || !institutionId) return
    setPhotoUploading(true)
    setPhotoError('')
    const token = localStorage.getItem('accessToken')
    const body = new FormData()
    Array.from(files).forEach((f) => body.append('file', f))
    try {
      const res = await fetch(`${API}/admin/institutions/${institutionId}/media`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' },
        body,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Rasm yuklashda xatolik')
      setPhotos((prev) => [...prev, ...(data.data as PhotoData[])])
      if (data.warnings?.length) setPhotoError(data.warnings.join(', '))
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Rasm yuklashda xatolik yuz berdi')
    } finally {
      setPhotoUploading(false)
    }
  }

  async function handlePhotoDelete(photoId: string) {
    if (!institutionId) return
    const token = localStorage.getItem('accessToken')
    setPhotos((prev) => prev.filter((p) => p.id !== photoId))
    try {
      const res = await fetch(`${API}/admin/institutions/${institutionId}/media/${photoId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' },
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "O'chirishda xatolik")
      }
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Rasmni o'chirishda xatolik yuz berdi")
      // Muvaffaqiyatsiz bo'lsa ro'yxatga qaytarib qo'yamiz
      if (institutionId) {
        fetch(`${API}/admin/institutions/${institutionId}`, {
          headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' },
        }).then((r) => r.json()).then((d) => {
          if (d.data?.media) setPhotos(d.data.media)
        }).catch(() => {})
      }
    }
  }

  /** O'zbek nomdan avtomatik slug yaratish */
  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[''`]/g, '')
      .replace(/[^a-z0-9\u0400-\u04ff\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      // Kirill → lotin transliteratsiya (sodda)
      .replace(/а/g,'a').replace(/б/g,'b').replace(/в/g,'v').replace(/г/g,'g')
      .replace(/д/g,'d').replace(/е/g,'e').replace(/ё/g,'yo').replace(/ж/g,'j')
      .replace(/з/g,'z').replace(/и/g,'i').replace(/й/g,'y').replace(/к/g,'k')
      .replace(/л/g,'l').replace(/м/g,'m').replace(/н/g,'n').replace(/о/g,'o')
      .replace(/п/g,'p').replace(/р/g,'r').replace(/с/g,'s').replace(/т/g,'t')
      .replace(/у/g,'u').replace(/ф/g,'f').replace(/х/g,'x').replace(/ц/g,'ts')
      .replace(/ч/g,'ch').replace(/ш/g,'sh').replace(/щ/g,'sh').replace(/ъ/g,'')
      .replace(/ы/g,'i').replace(/ь/g,'').replace(/э/g,'e').replace(/ю/g,'yu')
      .replace(/я/g,'ya').replace(/ў/g,'o').replace(/қ/g,'q').replace(/ғ/g,'g')
      .replace(/ҳ/g,'h').replace(/[^a-z0-9-]/g, '')
  }

  /** Google Places'dan qidirish — faqat "Qidirish" bosilganda (har harf uchun emas, pullik so'rov) */
  async function searchPlaces() {
    const q = placesQuery.trim()
    if (!q) return
    setPlacesLoading(true)
    setPlacesError('')
    setPlacesResults([])
    const token = localStorage.getItem('accessToken')
    try {
      const res = await fetch(`${API}/admin/places-import/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Xatolik')
      setPlacesResults(data.data ?? [])
      if ((data.data ?? []).length === 0) setPlacesError('Hech narsa topilmadi')
    } catch (err) {
      setPlacesError(err instanceof Error ? err.message : "Google Places bilan bog'lanishda xatolik")
    } finally {
      setPlacesLoading(false)
    }
  }

  /** Tanlangan joyni to'liq ma'lumot bilan (telefon/koordinata) formaga ko'chirish */
  async function importPlace(placeId: string) {
    setPlacesLoading(true)
    setPlacesError('')
    const token = localStorage.getItem('accessToken')
    try {
      const res = await fetch(`${API}/admin/places-import/details/${placeId}`, {
        headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Xatolik')
      const d: PlaceDetails = data.data
      setForm((prev) => ({
        ...prev,
        nameUz: prev.nameUz || d.name,
        slug:   prev.slug   || generateSlug(d.name),
        address: d.address || prev.address,
        phone:   d.phone   || prev.phone,
        lat:     d.lat != null ? String(d.lat) : prev.lat,
        lng:     d.lng != null ? String(d.lng) : prev.lng,
      }))
      setImported(true)
      setPlacesResults([])
      setPlacesQuery('')
    } catch (err) {
      setPlacesError(err instanceof Error ? err.message : "Google Places bilan bog'lanishda xatolik")
    } finally {
      setPlacesLoading(false)
    }
  }

  function toggleArray(field: 'languages' | 'paymentMethods' | 'shifts' | 'categories' | 'additionalTypes', val: string) {
    const arr = form[field] as string[]
    set(field, arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!form.nameUz.trim()) { setError("O'zbek nomi majburiy"); setTab('main'); return }
    if (!form.slug.trim())   { setError('Slug majburiy'); setTab('main'); return }
    if (!form.type)          { setError('Tur majburiy'); setTab('main'); return }

    setLoading(true)
    try {
      const url  = mode === 'create'
        ? `${API}/admin/institutions`
        : `${API}/admin/institutions/${institutionId}`
      const method = mode === 'create' ? 'POST' : 'PATCH'

      const body = JSON.stringify({
        ...form,
        isVerified:      form.isVerified,
        foundedYear:     form.foundedYear     || undefined,
        studentCount:    form.studentCount    || undefined,
        teacherCount:    form.teacherCount    || undefined,
        monthlyMin:      form.monthlyMin      || undefined,
        monthlyMax:      form.monthlyMax      || undefined,
        email:           form.email           || undefined,
        website:         form.website         || undefined,
        achievements:    form.achievements    || undefined,
        programs:        form.programs
          ? form.programs.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        specializations: form.specializations
          ? form.specializations.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        // Shahar tanlanmagan (bo'sh) qatorlar chala hisoblanadi va tashlab yuboriladi
        branches: form.branches.filter((b) => b.cityId),
      })

      const attemptSave = (accessToken: string) => fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'ngrok-skip-browser-warning': '1',
        },
        body,
      })

      let token = localStorage.getItem('accessToken') ?? ''
      let res = await attemptSave(token)

      // Token muddati uzoq forma to'ldirish paytida tugagan bo'lishi mumkin —
      // yozilgan ma'lumot YO'QOLMASDAN avtomatik yangilab bitta marta qayta
      // urinamiz (useAuth fonda muntazam yangilasa ham, chekka holatlar uchun
      // qo'shimcha himoya — masalan bir nechta tab yoki uzoq faolsizlik)
      if (res.status === 401) {
        try {
          const refreshed = await authApi.refresh() as { accessToken: string }
          token = refreshed.accessToken
          localStorage.setItem('accessToken', token)
          res = await attemptSave(token)
        } catch { /* refresh ham muvaffaqiyatsiz — pastda haqiqiy xato ko'rsatiladi, forma ma'lumoti saqlanib qoladi */ }
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Xatolik')

      setSuccess(mode === 'create' ? 'Muassasa yaratildi!' : 'Muassasa yangilandi!')
      if (mode === 'create') {
        // Rasm qo'shish uchun to'g'ridan-to'g'ri tahrirlash sahifasiga o'tamiz
        // (yangi yaratilgan muassasa ID'si endi mavjud)
        const newId = data.data?.id as string | undefined
        setTimeout(() => router.push(newId ? `/admin/institutions/${newId}/edit` : '/admin/institutions'), 1200)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Xatolik yuz berdi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-0">
      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl bg-gray-100 p-1 mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl py-2.5 text-sm font-semibold transition-colors ${
              tab === t.id
                ? 'bg-white shadow-sm text-primary-700'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <t.Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: ASOSIY ── */}
      {tab === 'main' && (
        <div className="space-y-4">
          {/* Admin Import Yordamchisi — Google Places'dan qidirib, nom/manzil/
              koordinata/telefonni avtomatik to'ldirish (faqat yangi qo'shishda) */}
          {mode === 'create' && (
            <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-4">
              <label className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                <Sparkles className="h-4 w-4 shrink-0 text-sky-600" strokeWidth={1.75} /> Google'dan tez import qilish
              </label>
              <p className="mb-3 text-xs text-gray-500">
                Muassasa nomini yozing — Google Maps'dan topib, nom/manzil/koordinata/telefonni avtomatik to'ldiramiz. Qolgan maydonlarni (dastur, narx, ta'lim profili) o'zingiz to'ldirasiz.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={placesQuery}
                  onChange={(e) => setPlacesQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchPlaces() } }}
                  placeholder="Masalan: Najot Ta'lim Chilonzor"
                  className={INPUT_CLS + ' flex-1 bg-white'}
                />
                <button
                  type="button"
                  onClick={searchPlaces}
                  disabled={placesLoading || !placesQuery.trim()}
                  className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:opacity-50"
                >
                  <Search className="h-4 w-4 shrink-0" strokeWidth={1.75} /> {placesLoading ? 'Qidirilmoqda...' : 'Qidirish'}
                </button>
              </div>

              {placesError && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-600">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {placesError}
                </p>
              )}

              {placesResults.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {placesResults.map((p) => (
                    <button
                      key={p.placeId}
                      type="button"
                      onClick={() => importPlace(p.placeId)}
                      disabled={placesLoading}
                      className="flex w-full items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-left transition-colors hover:border-sky-300 hover:bg-sky-50/50 disabled:opacity-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-800">{p.name}</p>
                        <p className="flex items-center gap-1 truncate text-xs text-gray-400">
                          <MapPin className="h-3 w-3 shrink-0" strokeWidth={1.75} /> {p.address}
                        </p>
                      </div>
                      {p.rating != null && (
                        <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-600">
                          <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" strokeWidth={1.75} /> {p.rating.toFixed(1)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {imported && (
                <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> Google'dan import qilindi — maydonlarni tekshirib, to'ldiring
                </p>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Nomi (O'zbek) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.nameUz}
                onChange={(e) => {
                  set('nameUz', e.target.value)
                  if (mode === 'create' && !form.slug) {
                    set('slug', generateSlug(e.target.value))
                  }
                }}
                placeholder="Masalan: Najot Ta'lim"
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Nomi (Rus)</label>
              <input
                type="text"
                value={form.nameRu}
                onChange={(e) => set('nameRu', e.target.value)}
                placeholder="Например: Найот Таълим"
                className={INPUT_CLS}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Slug (URL) <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.slug}
                onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="najot-talim"
                className={INPUT_CLS + ' flex-1'}
              />
              <button
                type="button"
                onClick={() => set('slug', generateSlug(form.nameUz))}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 whitespace-nowrap transition-colors"
              >
                Auto
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              URL: /institutions/{form.slug || 'slug'}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Tur <span className="text-red-500">*</span>
              </label>
              <SelectField value={form.type} onChange={setType} options={INSTITUTION_TYPES} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Status</label>
              <SelectField value={form.status} onChange={(v) => set('status', v)} options={STATUSES} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Qo'shimcha turlar</label>
            <p className="mb-2 text-xs text-gray-400">
              Muassasa yuqoridagi asosiy turdan tashqari yana boshqa yo'nalishlarda ham ishlaydimi? (ixtiyoriy, bir nechtasini tanlash mumkin)
            </p>
            <div className="flex flex-wrap gap-2">
              {INSTITUTION_TYPES.filter((t) => t.value !== form.type).map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => toggleArray('additionalTypes', t.value)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    form.additionalTypes.includes(t.value)
                      ? 'border-primary-500 bg-primary-600 text-white'
                      : 'border-gray-300 bg-white text-gray-600 hover:border-primary-400'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">O'qish formati</label>
            <SelectField value={form.deliveryMode} onChange={(v) => set('deliveryMode', v)} options={DELIVERY_MODES} />
            <p className="mt-1 text-xs text-gray-400">
              "Menga eng mos ta'lim markazini top" bo'limida moslik hisoblashda ishlatiladi — Onlayn/Gibrid tanlansa, shahar mos kelmasa ham tavsiya qilinadi
            </p>
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 hover:bg-gray-50">
            <div
              onClick={() => set('isVerified', !form.isVerified)}
              className={`relative h-6 w-11 rounded-full transition-colors ${form.isVerified ? 'bg-green-500' : 'bg-gray-200'}`}
            >
              <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.isVerified ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" strokeWidth={1.75} /> Tasdiqlangan muassasa
              </p>
              <p className="text-xs text-gray-400">
                Faqat ma'lumotlarni shaxsan tekshirgandan keyin yoqing — bu eng yuqori "🟢 Tasdiqlangan"
                darajasi. Egalik so'rovi (claim) tasdiqlanishi buni AVTOMATIK yoqmaydi — u faqat "🔵 Da'vo
                qilingan" holatini beradi.
              </p>
            </div>
          </label>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 hover:bg-gray-50">
            <div
              onClick={() => set('trialLessonEnabled', !form.trialLessonEnabled)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${form.trialLessonEnabled ? 'bg-emerald-500' : 'bg-gray-200'}`}
            >
              <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.trialLessonEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                <CalendarCheck className="h-4 w-4 shrink-0 text-emerald-500" strokeWidth={1.75} /> Probnoy darsga yozilish mavjud
              </p>
              <p className="text-xs text-gray-400">
                Faqat probnoy dars xizmatini taklif qiladigan muassasalarda yoqing — muassasa sahifasida bron tugmasi shunga qarab chiqadi
              </p>
            </div>
          </label>
        </div>
      )}

      {/* ── TAB: ALOQA ── */}
      {tab === 'contact' && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Telefon</label>
              <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)}
                placeholder="+998 90 123 45 67" className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Telefon 2</label>
              <input type="tel" value={form.phone2} onChange={(e) => set('phone2', e.target.value)}
                placeholder="+998 91 123 45 67" className={INPUT_CLS} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Email</label>
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                placeholder="info@example.uz" className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Veb-sayt</label>
              <input type="url" value={form.website} onChange={(e) => set('website', e.target.value)}
                placeholder="https://example.uz" className={INPUT_CLS} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Telegram</label>
              <div className="flex">
                <span className="flex items-center rounded-l-xl border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">@</span>
                <input type="text" value={form.telegram} onChange={(e) => set('telegram', e.target.value.replace('@', ''))}
                  placeholder="najottalim" className={INPUT_CLS + ' rounded-l-none'} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Instagram</label>
              <div className="flex">
                <span className="flex items-center rounded-l-xl border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">@</span>
                <input type="text" value={form.instagram} onChange={(e) => set('instagram', e.target.value.replace('@', ''))}
                  placeholder="najottalim" className={INPUT_CLS + ' rounded-l-none'} />
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Manzil</label>
            <input type="text" value={form.address} onChange={(e) => set('address', e.target.value)}
              placeholder="Toshkent sh., Mirzo Ulug'bek tumani, ..." className={INPUT_CLS} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                <MapPin className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={1.75} /> Kenglik (lat)
              </label>
              <input type="number" step="any" value={form.lat} onChange={(e) => set('lat', e.target.value)}
                placeholder="41.311081" className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Uzunlik (lng)</label>
              <input type="number" step="any" value={form.lng} onChange={(e) => set('lng', e.target.value)}
                placeholder="69.240562" className={INPUT_CLS} />
            </div>
          </div>
          {form.lat && form.lng && (
            <p className="text-xs text-gray-400">
              "Yaqinimda" va xarita funksiyalari uchun ishlatiladi — yuqoridagi Google import orqali avtomatik to'ldirilgan bo'lishi mumkin.
            </p>
          )}
        </div>
      )}

      {/* ── TAB: BATAFSIL ── */}
      {tab === 'details' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-primary-100 bg-primary-50/40 p-4">
            <label className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
              <Target className="h-4 w-4 shrink-0 text-primary-600" strokeWidth={1.75} /> Ta'lim profili
            </label>
            <p className="mb-3 text-xs text-gray-500">
              Muassasa aynan qaysi yo'nalishlarni o'qitishini belgilang — "Menga mosini top" algoritmida bu QATTIQ filtr sifatida ishlatiladi (belgilanmagan yo'nalish bo'yicha muassasa umuman tavsiya qilinmaydi)
            </p>
            <div className="flex flex-wrap gap-2">
              {EDUCATION_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => toggleArray('categories', cat.value)}
                  className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors border ${
                    form.categories.includes(cat.value)
                      ? 'border-primary-500 bg-primary-600 text-white shadow-sm'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:text-primary-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Tavsif (O'zbek)</label>
            <textarea
              value={form.descriptionUz}
              onChange={(e) => set('descriptionUz', e.target.value)}
              rows={4}
              placeholder="Muassasa haqida qisqacha ma'lumot..."
              className={INPUT_CLS + ' resize-none'}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Tavsif (Rus)</label>
            <textarea
              value={form.descriptionRu}
              onChange={(e) => set('descriptionRu', e.target.value)}
              rows={4}
              placeholder="Краткое описание учреждения..."
              className={INPUT_CLS + ' resize-none'}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Tashkil yili</label>
              <input type="number" value={form.foundedYear} onChange={(e) => set('foundedYear', e.target.value)}
                placeholder="2010" min="1800" max="2030" className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">O'quvchilar soni</label>
              <input type="number" value={form.studentCount} onChange={(e) => set('studentCount', e.target.value)}
                placeholder="500" min="0" className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">O'qituvchilar</label>
              <input type="number" value={form.teacherCount} onChange={(e) => set('teacherCount', e.target.value)}
                placeholder="30" min="0" className={INPUT_CLS} />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">O'qitish tillari</label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleArray('languages', lang)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors border ${
                    form.languages.includes(lang)
                      ? 'border-primary-500 bg-primary-600 text-white shadow-sm'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:text-primary-700'
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* O'quv markaz uchun qo'shimcha */}
          <div className="border-t border-gray-100 pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">O'quv markaz / Maktab uchun</p>

            <div className="space-y-4">
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                  <BookOpen className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={1.75} /> O'qitiladigan fanlar
                  <span className="ml-1 text-xs font-normal text-gray-400">(vergul bilan ajrating)</span>
                </label>
                <input
                  type="text"
                  value={form.programs}
                  onChange={(e) => set('programs', e.target.value)}
                  placeholder="Matematika, Fizika, Ingliz tili, Dasturlash..."
                  className={INPUT_CLS}
                />
                {form.programs && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {form.programs.split(',').map((p) => p.trim()).filter(Boolean).map((p) => (
                      <span key={p} className="rounded-lg bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">{p}</span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                  <Target className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={1.75} /> Ixtisosliklar
                  <span className="ml-1 text-xs font-normal text-gray-400">(vergul bilan ajrating)</span>
                </label>
                <input
                  type="text"
                  value={form.specializations}
                  onChange={(e) => set('specializations', e.target.value)}
                  placeholder="Frontend, Backend, Dizayn, IELTS..."
                  className={INPUT_CLS}
                />
              </div>

              <div>
                <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                  <Clock className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={1.75} /> Dars vaqtlari (smenalar)
                </label>
                <div className="flex flex-wrap gap-2">
                  {SHIFTS.map((shift) => (
                    <button
                      key={shift}
                      type="button"
                      onClick={() => toggleArray('shifts', shift)}
                      className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors border ${
                        form.shifts.includes(shift)
                          ? 'border-sky-500 bg-sky-600 text-white shadow-sm'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-sky-300 hover:text-sky-700'
                      }`}
                    >
                      {shift}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                  <Trophy className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={1.75} /> Muvaffaqiyatlar
                  <span className="ml-1 text-xs font-normal text-gray-400">(qancha o'quvchi OTMga kirdi va h.k.)</span>
                </label>
                <textarea
                  value={form.achievements}
                  onChange={(e) => set('achievements', e.target.value)}
                  rows={3}
                  placeholder="2024-yilda 150+ talabamiz OTMlarga kirdi. IELTS 7.0+ ball olganlar soni: 40+..."
                  className={INPUT_CLS + ' resize-none'}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: FILIALLAR ── */}
      {tab === 'branches' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-primary-100 bg-primary-50/40 p-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
              <Building2 className="h-4 w-4 shrink-0 text-primary-600" strokeWidth={1.75} /> Filiallar
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Bir xil muassasaning boshqa shaharlardagi filiallarini shu yerga qo'shing — masalan "PDP Academy"ning
              Toshkentdagi bosh markazi yuqoridagi "Asosiy" bo'limda, Buxoro/Farg'ona filiallari esa shu ro'yxatda
              bo'lishi kerak. Har biri UCHUN ALOHIDA muassasa YARATMANG (nom takrorlansa xato chiqadi).
            </p>
          </div>

          {form.branches.length === 0 && (
            <p className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
              Hali filial qo'shilmagan
            </p>
          )}

          <div className="space-y-3">
            {form.branches.map((b, i) => (
              <div key={i} className="rounded-xl border border-gray-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">Filial {i + 1}</p>
                  <button
                    type="button"
                    onClick={() => removeBranch(i)}
                    className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700"
                  >
                    <X className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> Olib tashlash
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-600">
                      Shahar <span className="text-red-500">*</span>
                    </label>
                    <SelectField
                      value={b.cityId}
                      onChange={(v) => updateBranch(i, { cityId: v })}
                      options={[{ value: '', label: 'Shahar tanlang' }, ...cities.map((c) => ({ value: c.id, label: c.nameUz }))]}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-600">Telefon</label>
                    <input type="tel" value={b.phone} onChange={(e) => updateBranch(i, { phone: e.target.value })}
                      placeholder="+998 90 123 45 67" className={INPUT_CLS} />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Manzil</label>
                  <input type="text" value={b.address} onChange={(e) => updateBranch(i, { address: e.target.value })}
                    placeholder="Ko'cha, uy raqami..." className={INPUT_CLS} />
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-600">
                      Filial nomi <span className="font-normal text-gray-400">(ixtiyoriy)</span>
                    </label>
                    <input type="text" value={b.nameUz} onChange={(e) => updateBranch(i, { nameUz: e.target.value })}
                      placeholder={form.nameUz || 'Bo\'sh qolsa asosiy nom ishlatiladi'} className={INPUT_CLS} />
                  </div>
                  <label className="mt-5 flex cursor-pointer items-center gap-2">
                    <input type="checkbox" checked={b.isMain} onChange={(e) => updateBranch(i, { isMain: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600" />
                    <span className="text-xs font-semibold text-gray-600">Asosiy filial (bosh ofis)</span>
                  </label>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addBranch}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-dashed border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:border-primary-300 hover:text-primary-700"
          >
            <Plus className="h-4 w-4 shrink-0" strokeWidth={2} /> Filial qo'shish
          </button>
        </div>
      )}

      {/* ── TAB: RASMLAR ── */}
      {tab === 'photos' && mode === 'edit' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-primary-100 bg-primary-50/40 p-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
              <Images className="h-4 w-4 shrink-0 text-primary-600" strokeWidth={1.75} /> Muassasa rasmlari
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Birinchi rasm qidiruv natijalarida asosiy (muqova) surat sifatida ko'rsatiladi. Yaxshi
              yoritilgan, sinf/o'quv jarayoni haqiqiy suratlari eng katta ishonch uyg'otadi.
            </p>
          </div>

          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 px-4 py-8 text-center transition-colors hover:border-primary-300 hover:bg-primary-50/30">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              disabled={photoUploading}
              onChange={(e) => { handlePhotoUpload(e.target.files); e.target.value = '' }}
              className="hidden"
            />
            {photoUploading ? (
              <>
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
                <span className="text-sm font-semibold text-gray-500">Yuklanmoqda...</span>
              </>
            ) : (
              <>
                <Upload className="h-6 w-6 shrink-0 text-gray-400" strokeWidth={1.75} />
                <span className="text-sm font-semibold text-gray-700">Rasm tanlash uchun bosing</span>
                <span className="text-xs text-gray-400">JPEG, PNG, WebP, GIF — har biri 5 MB gacha</span>
              </>
            )}
          </label>

          {photoError && (
            <p className="flex items-start gap-1.5 text-xs font-medium text-red-600">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {photoError}
            </p>
          )}

          {photos.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((p, i) => (
                <div key={p.id} className="group relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                  <Image
                    src={p.thumbnailUrl || p.url}
                    alt=""
                    fill
                    sizes="200px"
                    className="object-cover"
                  />
                  {i === 0 && (
                    <span className="absolute left-1.5 top-1.5 rounded-lg bg-primary-600 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                      Muqova
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handlePhotoDelete(p.id)}
                    aria-label="Rasmni o'chirish"
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: NARX ── */}
      {tab === 'pricing' && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Oylik narx (min, so'm)
              </label>
              <input type="number" value={form.monthlyMin} onChange={(e) => set('monthlyMin', e.target.value)}
                placeholder="500000" min="0" className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Oylik narx (max, so'm)
              </label>
              <input type="number" value={form.monthlyMax} onChange={(e) => set('monthlyMax', e.target.value)}
                placeholder="1500000" min="0" className={INPUT_CLS} />
            </div>
          </div>
          {form.monthlyMin && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-primary-700">
              <Wallet className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              {Number(form.monthlyMin).toLocaleString('uz-UZ').replace(/,/g,' ')} so'm
              {form.monthlyMax && ` — ${Number(form.monthlyMax).toLocaleString('uz-UZ').replace(/,/g,' ')} so'm`}
              /oyiga
            </p>
          )}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">To'lov usullari</label>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((pm) => (
                <button
                  key={pm}
                  type="button"
                  onClick={() => toggleArray('paymentMethods', pm)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors border ${
                    form.paymentMethods.includes(pm)
                      ? 'border-primary-500 bg-primary-600 text-white shadow-sm'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:text-primary-700'
                  }`}
                >
                  {pm}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error / success */}
      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} /> {error}
        </div>
      )}
      {success && (
        <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {success}
        </div>
      )}

      {/* Navigation + Submit */}
      <div className="mt-6 flex items-center justify-between gap-3">
        {/* Prev/Next tabs */}
        <div className="flex gap-2">
          {TABS.findIndex((t) => t.id === tab) > 0 && (
            <button
              type="button"
              onClick={() => setTab(TABS[TABS.findIndex((t) => t.id === tab) - 1].id)}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4 shrink-0" strokeWidth={1.75} /> Oldingi
            </button>
          )}
          {TABS.findIndex((t) => t.id === tab) < TABS.length - 1 && (
            <button
              type="button"
              onClick={() => setTab(TABS[TABS.findIndex((t) => t.id === tab) + 1].id)}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              Keyingi <ChevronRight className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-primary-600 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
        >
          {loading
            ? 'Saqlanmoqda...'
            : <><CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} /> {mode === 'create' ? 'Muassasa yaratish' : 'Saqlash'}</>}
        </button>
      </div>
    </form>
  )
}

const INPUT_CLS = 'w-full rounded-xl border border-gray-200 px-4 py-2.5 text-gray-900 outline-none focus:border-primary-400 text-sm transition-colors'

/**
 * Brauzer standart <select> ko'rinishini butun formaning boshqa
 * inputlariga mos qilib qayta stillashtiradi (appearance-none +
 * qo'lda chizilgan chevron) — native select xatti-harakati saqlanadi.
 */
function SelectField({ value, onChange, options }: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT_CLS + ' cursor-pointer appearance-none bg-white pr-9'}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={1.75} />
    </div>
  )
}
