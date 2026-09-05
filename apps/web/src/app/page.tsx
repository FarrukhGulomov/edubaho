'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Sparkles, ChevronDown, Star, ArrowLeftRight, ArrowRight, Crown } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import BrandMark from '@/components/shared/BrandMark'
import { RatingHint } from '@/components/shared/StarRating'
import LiveStatsPill from '@/components/shared/LiveStatsPill'
import VerificationBadge from '@/components/shared/VerificationBadge'
import InstitutionMetrics from '@/components/shared/InstitutionMetrics'
import { priceFrom } from '@/lib/price'
import { institutionsRu } from '@/lib/plural'
import { useLang, t } from '@/contexts/LangContext'
import { useCompare, useSaved } from '@/hooks/useCompare'
import { matchApi, searchApi, type MatchInsights } from '@/lib/api'
import { GOAL_SUGGESTIONS } from '@/lib/matchConstants'

interface NameSuggestion {
  id: string
  nameUz: string
  nameRu?: string
  type: string
  slug: string
}

interface InstCard {
  id: string
  nameUz: string
  nameRu?: string
  slug: string
  type: string
  avgRating?: number
  reviewCount: number
  isVerified: boolean
  isPinned: boolean
  verificationLevel: 'UNVERIFIED' | 'CLAIMED' | 'VERIFIED'
  city?: { nameUz: string; nameRu?: string }
  media?: { url: string; thumbnailUrl?: string | null }[]
  pricing?: { monthlyMin?: number; monthlyMax?: number; yearlyMin?: number; yearlyMax?: number }
  details?: {
    studentCount?: number | null
    teacherCount?: number
    foundedYear?: number | null
    programs?: string[]
  }
  subscription?: { plan: string }
}

const TYPE_LABELS: Record<string, { uz: string; ru: string }> = {
  COURSE_CENTER:   { uz: "O'quv markaz",  ru: 'Учебный центр' },
  SCHOOL:          { uz: 'Maktab',        ru: 'Школа' },
  IT_SCHOOL:       { uz: 'IT maktab',     ru: 'IT школа' },
  LANGUAGE_CENTER: { uz: 'Til markazi',   ru: 'Языковой' },
  UNIVERSITY:      { uz: 'Universitet',   ru: 'Университет' },
  KINDERGARTEN:    { uz: "Bog'cha",       ru: 'Детсад' },
  LYCEUM:          { uz: 'Litsey',        ru: 'Лицей' },
  SPORTS_SCHOOL:   { uz: 'Sport',         ru: 'Спорт' },
  ARTS_SCHOOL:     { uz: "San'at",        ru: 'Искусство' },
}

export default function HomePage() {
  const { lang } = useLang()
  const uz = lang === 'uz'
  const router = useRouter()

  const [topInstitutions, setTopInstitutions] = useState<InstCard[]>([])
  const [loadingTop, setLoadingTop] = useState(true)

  // Hero'dagi EduFit taklif: MVP'da faqat O'quv markaz bilan ishlaymiz,
  // shuning uchun tur tanlash qadami olib tashlandi — foydalanuvchi
  // to'g'ridan-to'g'ri maqsadini kiritadi (mosini-tanla wizard'ining
  // "goal" qadami shu yerda, bosh sahifaning asosiy oynasida)
  const [heroGoal, setHeroGoal] = useState('')
  const [heroInsights, setHeroInsights] = useState<MatchInsights | null>(null)

  // Bilgan muassasa nomini yozganda ham topsin — bir xil input ikki vazifani
  // bajaradi: erkin maqsad (Fan/IELTS kabi) VA muassasa nomi bo'yicha
  // to'g'ridan-to'g'ri qidiruv. Mavjud /search/suggest (Prisma, Meilisearch
  // shart emas) ishlatiladi — ilgari frontendda hech qayerda chaqirilmagan edi.
  const [nameSuggestions, setNameSuggestions] = useState<NameSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const { toggle: toggleCompare, isSelected: isCompared } = useCompare()
  const { toggleSave, isSaved } = useSaved()

  // Pastga aylantirish ishorasi — foydalanuvchi scroll boshlagach yo'qoladi
  // (hero'dan uzoqlashganda ekranni band qilib turmasligi uchun)
  const [showScrollHint, setShowScrollHint] = useState(true)
  useEffect(() => {
    function onScroll() { setShowScrollHint(window.scrollY < 60) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function scrollToPopular() {
    const el = document.getElementById('popular-institutions')
    if (!el) return
    // Sticky header balandligini hisobga olib, sarlavha header ostida
    // "yashirinib" qolmasligi uchun kichik offset qo'shiladi
    const top = el.getBoundingClientRect().top + window.scrollY - 72
    window.scrollTo({ top, behavior: 'smooth' })
  }

  const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

  // Bosh sahifada faqat qisqa "eng yaxshi baholangan" preview — to'liq
  // katalog (filtr/sort/pagination) /search'da, ikki marta yozilmasin
  useEffect(() => {
    fetch(`${API}/institutions?sortBy=rating&limit=6`, {
      headers: { 'ngrok-skip-browser-warning': '1' },
    })
      .then(r => r.json())
      .then(data => setTopInstitutions(data.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingTop(false))
  }, [API])

  // Foydalanuvchi hero'da maqsadini yozayotganda — real DB'dan hisoblangan
  // aniq son ko'rsatiladi (400ms debounce), /match sahifasidagi InsightsCard
  // bilan bir xil endpoint (matchApi.insights) qayta ishlatiladi
  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      matchApi.insights({ type: 'COURSE_CENTER', goal: heroGoal || undefined })
        .then((r) => { if (!cancelled) setHeroInsights(r.data) })
        .catch(() => { if (!cancelled) setHeroInsights(null) })
    }, 400)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [heroGoal])

  // Xuddi shu matn muassasa nomiga o'xshasa — nom bo'yicha takliflar (parallel,
  // yuqoridagi "goal" hisob-kitobiga ta'sir qilmaydi)
  useEffect(() => {
    const q = heroGoal.trim()
    if (q.length < 2) { setNameSuggestions([]); return }
    let cancelled = false
    const timer = setTimeout(() => {
      searchApi.suggest(q)
        .then((r) => { if (!cancelled) setNameSuggestions((r.data ?? []) as NameSuggestion[]) })
        .catch(() => { if (!cancelled) setNameSuggestions([]) })
    }, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [heroGoal])

  // Maqsad kiritilgan-u, aynan shu yo'nalish bo'yicha muassasa topilmasa —
  // "Davom etish" tugmasi ma'nosiz bo'ladi (mos kelmaydigan yo'nalish bilan
  // wizard'ga o'tishning foydasi yo'q)
  const heroZeroMatch = !!heroGoal.trim() && heroInsights?.matchingCount === 0

  // goalOverride — pill bosilganda heroGoal state hali yangilanmagan bo'ladi
  // (React setState darhol qo'llanmaydi), shuning uchun aniq qiymat
  // parametr sifatida uzatiladi (stale-closure xatosining oldi olinadi)
  function goToMatch(goalOverride?: string) {
    const goal = (goalOverride ?? heroGoal).trim()
    router.push(goal ? `/match?type=COURSE_CENTER&goal=${encodeURIComponent(goal)}` : '/match?type=COURSE_CENTER')
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />

      {/* ── BilimOn hero — user saytga kirganda BIRINCHI ko'radigan narsa.
             Banner emas: EduFit wizard'ining "maqsad" qadami to'g'ridan-to'g'ri
             shu yerda (asosiy oynada). MVP'da faqat O'quv markaz bilan
             ishlaymiz, shuning uchun tur tanlash qadami olib tashlandi —
             foydalanuvchi darhol maqsadini kiritadi va /match wizard'iga
             formatdan (tur/maqsad allaqachon ma'lum) davom etadi. ── */}
      {/* Vertikal bo'shliq qisqartirildi — asosiy amal (qidiruv maydoni)
          birinchi ekranda darhol ko'rinishi uchun */}
      <div className="relative border-b border-gray-200 bg-white px-4 pb-10 pt-6 sm:pb-12 sm:pt-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-1.5 flex items-center justify-center gap-2 text-primary-600">
            <BrandMark size={20} className="shrink-0" />
            <span className="text-sm font-bold uppercase tracking-wide">BilimOn</span>
          </div>
          {/* Sarlavha — hurmatli, izchil ohang ("senga" emas, "sizga").
              Live hisoblagich pastga ko'chirildi: u sarlavha bilan
              e'tibor uchun raqobatlashmasligi kerak. */}
          <h1 className="mb-2 text-center text-2xl font-bold leading-tight text-gray-900 sm:text-4xl">
            {t(lang, {
              uz: "Sizga qaysi ta'lim muassasasi mos?",
              ru: 'Какое учебное заведение вам подходит?',
            })}
          </h1>
          <p className="mb-5 text-center text-sm text-gray-500 sm:text-base">
            {t(lang, {
              uz: "Maqsadingizni kiriting va mos ta'lim muassasalarini toping.",
              ru: 'Укажите вашу цель — и мы подберём подходящие учебные заведения.',
            })}
          </p>

          {/* EduFit wizard'ining "maqsad" qadami — hero'ning asosiy vidjeti.
              Pastdagi tavsiya pilllari bosilganda darhol /match'ga o'tiladi.
              Erkin matn kiritilganda esa Enter YOKI input ichidagi kichik
              strelka-tugma orqali davom etiladi — oddiy foydalanuvchi
              Enter haqida bilmasligi mumkin, shuning uchun ko'rinadigan
              tugma ham kerak (mos muassasa topilmasa — heroZeroMatch —
              ikkalasi ham bloklanadi) */}
          <div className="relative mb-3">
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-sm focus-within:border-primary-400">
              <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
                <Sparkles className="h-5 w-5 shrink-0 text-primary-500" strokeWidth={1.75} />
                <input
                  type="text"
                  value={heroGoal}
                  onChange={(e) => setHeroGoal(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !heroZeroMatch) { e.preventDefault(); goToMatch() } }}
                  placeholder={t(lang, {
                    uz: 'Masalan: IELTS, Frontend yoki muassasa nomi',
                    ru: 'Например: IELTS, Frontend или название учреждения',
                  })}
                  maxLength={100}
                  aria-label={t(lang, { uz: "O'quv maqsadingiz yoki muassasa nomi", ru: 'Ваша учебная цель или название учреждения' })}
                  className="min-w-0 flex-1 bg-transparent py-2 text-base text-gray-900 outline-none placeholder:text-gray-400"
                />
              </div>
              {heroGoal.trim() && (
                <button
                  onClick={() => goToMatch()}
                  disabled={heroZeroMatch}
                  aria-label={uz ? 'Davom etish' : 'Продолжить'}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                >
                  <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.25} />
                </button>
              )}
            </div>

            {/* Muassasa nomi bo'yicha takliflar — bosilganda to'g'ridan-to'g'ri
                shu muassasa profiliga o'tadi (goal-flow'dan mustaqil) */}
            {showSuggestions && nameSuggestions.length > 0 && (
              <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                <p className="px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  {t(lang, { uz: 'Shu nomdagi muassasalar', ru: 'Учреждения с этим названием' })}
                </p>
                {nameSuggestions.map((s) => {
                  const info = TYPE_LABELS[s.type]
                  const name = uz || !s.nameRu ? s.nameUz : s.nameRu
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => router.push(`/institutions/${s.slug}`)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      <span className="min-w-0 flex-1 truncate font-medium text-gray-900">{name}</span>
                      <span className="shrink-0 text-xs text-gray-400">{info ? (uz ? info.uz : info.ru) : s.type}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Real DB'dan hisoblangan live son — soxta statistika emas.
              Maqsad kiritilgunga qadar umumiy son ko'rsatiladi ("31 ta
              ta'lim muassasasi mavjud"), kiritilgandan keyin esa tanlovga
              mos kelgan son. Ruscha shaklda son bilan kelgan ot to'g'ri
              tuslanadi (pluralRu) — "Подходит 31 учреждений" xato edi. */}
          <p
            className="mb-3 min-h-[1.25rem] text-center text-xs font-semibold text-primary-600"
            aria-live="polite"
          >
            {!heroInsights
              ? ''
              : !heroGoal.trim()
                // Katalog bo'sh bo'lsa "0 ta muassasa mavjud" deb yozish
                // sayt ishlamayotgandek taassurot qoldiradi — jim o'tamiz
                ? (heroInsights.totalInThisType === 0
                    ? ''
                    : t(lang, {
                        uz: `${heroInsights.totalInThisType} ta ta'lim muassasasi mavjud`,
                        ru: `Доступно ${institutionsRu(heroInsights.totalInThisType)}`,
                      }))
                : heroInsights.matchingCount === 0
                  ? t(lang, {
                      uz: "Bu yo'nalish bo'yicha hozircha muassasa yo'q — boshqa fan bilan sinab ko'ring",
                      ru: 'По этому направлению пока нет учреждений — попробуйте другой предмет',
                    })
                  : t(lang, {
                      uz: `Tanlovingizga ${heroInsights.matchingCount} ta muassasa mos keldi`,
                      ru: `Вашему выбору ${heroInsights.matchingCount === 1 ? 'соответствует' : 'соответствуют'} ${institutionsRu(heroInsights.matchingCount)}`,
                    })}
          </p>

          {/* Ommabop maqsadlar — qidiruv maydonidan keyingi ikkinchi qadam.
              Sarlavhasi bor: ilgari bu pill'lar nima ekani izohsiz edi. */}
          <h2 className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">
            {t(lang, { uz: 'Ommabop maqsadlar', ru: 'Популярные цели' })}
          </h2>
          <div className="mb-5 flex flex-wrap justify-center gap-1.5">
            {(GOAL_SUGGESTIONS.COURSE_CENTER ?? []).map((g) => (
              <button
                key={g.value}
                // Pill bosilishi — o'zi to'liq tanlov, darhol /match'ga o'tadi
                onClick={() => { setHeroGoal(g.value); goToMatch(g.value) }}
                className={`tap-center rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  heroGoal === g.value
                    ? 'border-primary-500 bg-primary-600 text-white'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-primary-400'
                }`}
              >
                {t(lang, g.label)}
              </button>
            ))}
          </div>

          {/* Live hisoblagich — ikkinchi darajali o'rin. Sarlavha ustida
              turganda asosiy xabardan chalg'itardi; bu yerda esa u
              nima uchun kerak bo'lsa shuni qiladi: ishonch signali. */}
          <div className="flex justify-center">
            <LiveStatsPill />
          </div>

          {/* Ikkinchi qidiruv qutisi olib tashlandi — hero'da yuqorida
              allaqachon maqsad-input mavjud, bitta oynada 2 ta qidiruv
              chalkash edi. Umumiy qidiruv Header navigatsiyasida ("Qidirish")
              orqali mavjud. Tezkor tur-filtri (Barchasi/O'quv markazlar/
              Maktablar/Bog'chalar) ham olib tashlandi — MVP'da faqat
              O'quv markaz aktiv, qolganlari qulflangan holda ortiqcha
              bo'sh joy va chalg'ituvchi ko'rinardi. */}
        </div>

        {/* Pastga aylantirish ishorasi — hero balandligi katta bo'lgani
            uchun, pastda yana kontent (Ommabop muassasalar) borligini
            ko'rsatadi. Scroll boshlanishi bilan yo'qoladi (chalg'itmasligi
            uchun), bosilsa keyingi bo'limga silliq o'tadi. Barcha
            device'larda ko'rinadi (faqat desktop emas). */}
        <button
          onClick={scrollToPopular}
          aria-label={uz ? 'Pastga o\'tish' : 'Прокрутить вниз'}
          tabIndex={showScrollHint ? 0 : -1}
          className={`absolute inset-x-0 bottom-1.5 mx-auto flex h-8 w-8 items-center justify-center rounded-full text-primary-400 transition-colors transition-opacity duration-300 hover:text-primary-600 sm:bottom-2.5 sm:h-9 sm:w-9 ${
            showScrollHint ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <ChevronDown className="h-6 w-6 animate-bounce sm:h-7 sm:w-7" strokeWidth={2} />
        </button>
      </div>

      {/* ── Eng yaxshi baholangan muassasalar — qisqa preview, to'liq
             katalog emas. Filtrlash/saralash/pagination faqat /search'da. ── */}
      <div id="popular-institutions" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Sparkles className="h-5 w-5 shrink-0 text-amber-500" strokeWidth={1.75} />
            {uz ? 'Ommabop muassasalar' : 'Популярные учреждения'}
          </h2>
          <Link href="/search" className="flex shrink-0 items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700">
            {uz ? 'Barchasini ko\'rish' : 'Смотреть все'}
            <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2} />
          </Link>
        </div>

        {loadingTop ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="space-y-3">
                  <div className="shimmer h-4 w-24 rounded-full" />
                  <div className="shimmer h-5 w-4/5 rounded-xl" />
                  <div className="shimmer h-4 w-1/2 rounded-xl" />
                  <div className="shimmer h-4 w-2/3 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : topInstitutions.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topInstitutions.map(inst => {
              const info     = TYPE_LABELS[inst.type]
              const name     = uz || !inst.nameRu ? inst.nameUz : inst.nameRu
              const city     = inst.city ? (uz || !inst.city.nameRu ? inst.city.nameUz : inst.city.nameRu) : null
              const saved    = isSaved(inst.id)
              const compared = isCompared(inst.id)
              const price    = priceFrom(inst.pricing, lang)

              return (
                <div key={inst.id} className="group card flex flex-col p-0">
                  {/* Karta tanasi — rasm boxi hozircha yashirilgan (ko'p
                      muassasada hali rasm yo'q, bosh harflar "bo'sh"
                      taassurot qoldirardi) */}
                  <Link href={`/institutions/${inst.slug}`} className="flex flex-1 flex-col p-4 pb-0">
                    {/* Tur + status teglar */}
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      <span className="badge-sm bg-primary-50 text-primary-700">
                        {info ? (uz ? info.uz : info.ru) : inst.type}
                      </span>
                      <VerificationBadge level={inst.verificationLevel} lang={lang} size="xs" />
                      {inst.subscription?.plan === 'PREMIUM' && (
                        <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                          <Sparkles className="h-3 w-3" strokeWidth={2} /> Premium
                        </span>
                      )}
                      {inst.isPinned && (
                        <span title={t(lang, { uz: 'Tavsiya etiladi', ru: 'Рекомендуется' })} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-sm ring-1 ring-amber-200">
                          <Crown className="h-4 w-4 shrink-0 text-white" strokeWidth={2} fill="currentColor" />
                        </span>
                      )}
                    </div>

                    {/* Nom */}
                    <h3 className="mb-1.5 min-h-[2.75rem] text-base font-black text-gray-900 group-hover:text-primary-700 transition-colors line-clamp-2 leading-snug">
                      {name}
                    </h3>

                    {/* Yo'nalishlar preview — teglar soni har xil bo'lsa ham
                        kartalar bir xil balandlikda qolishi uchun sm+
                        ekranlarda (yonma-yon qatorlashganda) balandlik
                        qattiq belgilanadi. Mobilda (1 ustunli) esa "+N"
                        belgisi ikkinchi qatorga tushib yashirinib qolmasligi
                        uchun to'liq ko'rsatiladi */}
                    <div className="mb-2 flex flex-wrap gap-1 sm:h-6 sm:overflow-hidden">
                      {inst.details?.programs?.slice(0, 2).map(p => (
                        <span key={p} className="max-w-full truncate rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700" title={p}>
                          {p}
                        </span>
                      ))}
                      {(inst.details?.programs?.length ?? 0) > 2 && (
                        <span className="rounded-lg bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                          +{inst.details!.programs!.length - 2}
                        </span>
                      )}
                    </div>

                    {/* Shahar + statistika — har bir son yonida yozuv bor
                        (ilgari faqat ikonka edi: "500–1 000" nimani
                        bildirishini bilib bo'lmasdi) */}
                    <InstitutionMetrics
                      lang={lang}
                      className="mb-2"
                      data={{
                        city,
                        studentCount: inst.details?.studentCount,
                        teacherCount: inst.details?.teacherCount,
                        foundedYear: inst.details?.foundedYear,
                      }}
                    />

                    {/* Narx + reyting. Narx davri ANIQ ko'rsatiladi
                        ("Oyiga ...dan") — shunchaki "600 000 so'm" chalkash edi */}
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 border-t border-gray-100 pt-3">
                      {inst.avgRating ? (
                        <RatingHint rating={inst.avgRating} count={inst.reviewCount} lang={lang} />
                      ) : (
                        <span className="text-xs text-gray-400">{t(lang, { uz: "Sharh yo'q", ru: 'Нет отзывов' })}</span>
                      )}
                      {price && (
                        <span className="price-badge whitespace-nowrap text-xs">{price.full}</span>
                      )}
                    </div>
                  </Link>

                  {/* Saqlash / Solishtirish tugmalari */}
                  <div className="flex gap-1.5 border-t border-gray-50 p-4 pt-2">
                    <button
                      onClick={() => toggleSave(inst)}
                      className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                        saved
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      <Star className="h-3.5 w-3.5" fill={saved ? 'currentColor' : 'none'} strokeWidth={2} />
                      {uz ? (saved ? "Saqlandi" : "Saqlash") : (saved ? "Сохранено" : "Сохранить")}
                    </button>
                    <button
                      onClick={() => toggleCompare(inst)}
                      className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                        compared
                          ? 'bg-primary-50 text-primary-700'
                          : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      <ArrowLeftRight className="h-3.5 w-3.5" strokeWidth={2} />
                      {uz ? (compared ? "Tanlandi" : "Solishtir") : (compared ? "Выбрано" : "Сравнить")}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Katalogga o'tish — asosiy CTA, /search yagona to'liq katalog */}
        <div className="mt-8 flex justify-center">
          <Link href="/search" className="btn-secondary px-8 py-3 text-base">
            {uz ? "Barcha muassasalarni ko'rish" : 'Смотреть все учреждения'}
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  )
}
