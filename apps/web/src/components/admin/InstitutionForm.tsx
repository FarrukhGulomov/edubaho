'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

const INSTITUTION_TYPES = [
  { value: 'IT_SCHOOL',       label: '💻 IT maktab' },
  { value: 'UNIVERSITY',      label: '🎓 Universitet' },
  { value: 'SCHOOL',          label: '📚 Maktab' },
  { value: 'KINDERGARTEN',    label: "🎨 Bog'cha" },
  { value: 'LANGUAGE_CENTER', label: '🌐 Til markazi' },
  { value: 'COURSE_CENTER',   label: '✏️ Kurs markazi' },
  { value: 'SPORTS_SCHOOL',   label: '⚽ Sport maktabi' },
  { value: 'LYCEUM',          label: '🏫 Litsey' },
  { value: 'COLLEGE',         label: '🏛️ Kollej' },
  { value: 'TUTORING',        label: '👨‍🏫 Repetitor' },
  { value: 'ARTS_SCHOOL',     label: "🎭 San'at maktabi" },
]

const STATUSES = [
  { value: 'PENDING',   label: '⏳ Kutilmoqda' },
  { value: 'ACTIVE',    label: '✅ Faol' },
  { value: 'PREMIUM',   label: '⭐ Premium' },
  { value: 'SUSPENDED', label: '🚫 To\'xtatilgan' },
  { value: 'INACTIVE',  label: '❌ Nofaol' },
]

const PAYMENT_METHODS = ['Payme', 'Click', 'Uzcard', 'Humo', 'Naqd']
const LANGUAGES = ['uz', 'ru', 'en', 'de', 'fr', 'ko', 'zh']
const SHIFTS = ['Ertalabki (08:00-13:00)', 'Tushki (13:00-18:00)', 'Kechki (18:00-22:00)', 'Hafta oxiri', 'Online']

export interface InstitutionFormData {
  nameUz: string
  nameRu: string
  slug: string
  type: string
  status: string
  isVerified: boolean
  phone: string
  phone2: string
  email: string
  website: string
  telegram: string
  instagram: string
  address: string
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
  monthlyMin: string
  monthlyMax: string
  paymentMethods: string[]
}

const EMPTY: InstitutionFormData = {
  nameUz: '', nameRu: '', slug: '', type: 'IT_SCHOOL', status: 'PENDING',
  isVerified: false, phone: '', phone2: '', email: '', website: '',
  telegram: '', instagram: '', address: '',
  descriptionUz: '', descriptionRu: '',
  foundedYear: '', studentCount: '', teacherCount: '',
  languages: [], programs: '', specializations: '', shifts: [], achievements: '',
  monthlyMin: '', monthlyMax: '', paymentMethods: [],
}

const TABS = [
  { id: 'main',    label: '📋 Asosiy' },
  { id: 'contact', label: '📞 Aloqa' },
  { id: 'details', label: 'ℹ️ Batafsil' },
  { id: 'pricing', label: '💰 Narx' },
]

interface Props {
  initialData?: Partial<InstitutionFormData>
  institutionId?: string   // set when editing
  mode: 'create' | 'edit'
}

export default function InstitutionForm({ initialData, institutionId, mode }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState('main')
  const [form, setForm] = useState<InstitutionFormData>({ ...EMPTY, ...initialData })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function set(field: keyof InstitutionFormData, value: string | boolean | string[]) {
    setForm((prev) => ({ ...prev, [field]: value }))
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

  function toggleArray(field: 'languages' | 'paymentMethods' | 'shifts', val: string) {
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
    const token = localStorage.getItem('accessToken')
    try {
      const url  = mode === 'create'
        ? `${API}/admin/institutions`
        : `${API}/admin/institutions/${institutionId}`
      const method = mode === 'create' ? 'POST' : 'PATCH'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'ngrok-skip-browser-warning': '1',
        },
        body: JSON.stringify({
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
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Xatolik')

      setSuccess(mode === 'create' ? '✅ Muassasa yaratildi!' : '✅ Muassasa yangilandi!')
      if (mode === 'create') {
        setTimeout(() => router.push('/admin/institutions'), 1200)
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
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
              tab === t.id
                ? 'bg-white shadow-sm text-primary-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: ASOSIY ── */}
      {tab === 'main' && (
        <div className="space-y-4">
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
                className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 whitespace-nowrap"
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
              <select
                value={form.type}
                onChange={(e) => set('type', e.target.value)}
                className={INPUT_CLS}
              >
                {INSTITUTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Status</label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                className={INPUT_CLS}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 hover:bg-gray-50">
            <div
              onClick={() => set('isVerified', !form.isVerified)}
              className={`relative h-6 w-11 rounded-full transition-colors ${form.isVerified ? 'bg-green-500' : 'bg-gray-200'}`}
            >
              <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.isVerified ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">✓ Tasdiqlangan muassasa</p>
              <p className="text-xs text-gray-400">Qidiruv natijalarida "Tasdiqlangan" badge ko'rsatiladi</p>
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
        </div>
      )}

      {/* ── TAB: BATAFSIL ── */}
      {tab === 'details' && (
        <div className="space-y-4">
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
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                    form.languages.includes(lang)
                      ? 'bg-primary-600 text-white'
                      : 'border border-gray-200 text-gray-700 hover:border-primary-300'
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* O'quv markaz uchun qo'shimcha */}
          <div className="border-t border-gray-100 pt-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">O'quv markaz / Maktab uchun</p>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  📚 O'qitiladigan fanlar
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
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  🎯 Ixtisosliklar
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
                <label className="mb-2 block text-sm font-semibold text-gray-700">🕐 Dars vaqtlari (smenalar)</label>
                <div className="flex flex-wrap gap-2">
                  {SHIFTS.map((shift) => (
                    <button
                      key={shift}
                      type="button"
                      onClick={() => toggleArray('shifts', shift)}
                      className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                        form.shifts.includes(shift)
                          ? 'bg-sky-600 text-white'
                          : 'border border-gray-200 text-gray-700 hover:border-sky-300'
                      }`}
                    >
                      {shift}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  🏆 Muvaffaqiyatlar
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
            <p className="text-sm text-primary-700 font-medium">
              💰 {Number(form.monthlyMin).toLocaleString('uz-UZ').replace(/,/g,' ')} so'm
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
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                    form.paymentMethods.includes(pm)
                      ? 'bg-primary-600 text-white'
                      : 'border border-gray-200 text-gray-700 hover:border-primary-300'
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
          <span>⚠️</span> {error}
        </div>
      )}
      {success && (
        <div className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
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
              className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              ← Oldingi
            </button>
          )}
          {TABS.findIndex((t) => t.id === tab) < TABS.length - 1 && (
            <button
              type="button"
              onClick={() => setTab(TABS[TABS.findIndex((t) => t.id === tab) + 1].id)}
              className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Keyingi →
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-primary-600 px-8 py-3 font-bold text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {loading ? '⏳ Saqlanmoqda...' : mode === 'create' ? '✅ Muassasa yaratish' : '✅ Saqlash'}
        </button>
      </div>
    </form>
  )
}

const INPUT_CLS = 'w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-sm'
