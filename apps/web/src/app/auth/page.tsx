'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Star, PencilLine, ArrowLeftRight, Smartphone, AlertCircle, CheckCircle2, Send, ShieldCheck } from 'lucide-react'
import { authApi } from '@/lib/api'
import { useLang, t } from '@/contexts/LangContext'
import { authTrack } from '@/lib/analytics'
import { isTelegramWebApp } from '@/lib/telegram'
import Logo from '@/components/shared/Logo'

type Step = 'phone' | 'otp' | 'done'

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? 'edubahobot'
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ''

// Playmobile (SMS provider) bilan shartnoma hali yo'q — telefon/OTP orqali
// kirish vaqtincha yashirilgan (backend/logika o'zgarishsiz, faqat UI'da
// ko'rinmaydi). Shartnoma tuzilgach shu flagni true qilish kifoya.
const PHONE_AUTH_ENABLED = false

// Google Identity Services global tipi
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
          }) => void
          renderButton: (parent: HTMLElement, options: Record<string, string | number>) => void
        }
      }
    }
  }
}

/**
 * Login'dan keyin qaytish manzili (?next=/institutions/slug) —
 * faqat ichki yo'llar qabul qilinadi (open-redirect himoyasi)
 */
function readNextParam(): string | null {
  if (typeof window === 'undefined') return null
  const n = new URLSearchParams(window.location.search).get('next')
  return n && n.startsWith('/') && !n.startsWith('//') ? n : null
}

/**
 * Referral kodi (?ref=ABC12345) — do'st havolasi orqali kelganda.
 * Faqat YANGI hisob yaratilganda backend tomonidan ishlatiladi (mavjud
 * userga hech qanday ta'siri yo'q), shuning uchun bu yerda qat'iy
 * validatsiya shart emas — backend o'zi kodni tekshiradi.
 */
function readRefParam(): string | null {
  if (typeof window === 'undefined') return null
  const r = new URLSearchParams(window.location.search).get('ref')
  return r && /^[A-Za-z0-9]{4,20}$/.test(r) ? r.toUpperCase() : null
}

export default function AuthPage() {
  const { lang, setLang } = useLang()
  const [step, setStep]       = useState<Step>('phone')
  const [phone, setPhone]     = useState('+998 ')
  const [otp, setOtp]         = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [countdown, setCountdown] = useState(0)
  // Foydalanuvchi qayerdan kelgan — login'dan keyin o'sha yerga qaytariladi.
  // Telegram redirect'i URL'ni almashtirgani uchun boshidayoq saqlab olamiz.
  const [nextUrl] = useState(readNextParam)
  const [refCode] = useState(readRefParam)
  const [isNewUser, setIsNewUser] = useState(false)
  // Shaxsiy ma'lumotlarni qayta ishlashga rozilik — Telegram/Google
  // tugmalari shu belgilanmaguncha faollashmaydi (implicit emas, explicit rozilik)
  const [consentChecked, setConsentChecked] = useState(false)
  // Telegram widget haqiqatan render bo'ldimi — bo'lmasa bo'sh joy va
  // "yoki" ajratgichni ko'rsatmaymiz (sahifa buzilgandek ko'rinmasligi uchun)
  const [tgReady, setTgReady] = useState(false)
  const otpRef  = useRef<HTMLInputElement>(null)
  const tgRef   = useRef<HTMLDivElement>(null)
  const googleRef = useRef<HTMLDivElement>(null)

  // Auth sahifasi ochildi
  useEffect(() => { authTrack.started() }, [])

  // Telegram Mini App ichida foydalanuvchi avtomatik kirgan bo'ladi —
  // login sahifasi kerak emas, to'g'ridan-to'g'ri profilga
  useEffect(() => {
    if (!isTelegramWebApp()) return
    const goProfile = () => window.location.replace('/profile')
    if (localStorage.getItem('accessToken')) goProfile()
    else window.addEventListener('twa-auth', goProfile)
    return () => window.removeEventListener('twa-auth', goProfile)
  }, [])

  // Telegram redirect mode: URL da hash bo'lsa avtomatik login
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const hash = params.get('hash')
    const id = params.get('id')
    if (!hash || !id) return

    setLoading(true)
    setError('')

    const tgUser = {
      id:         Number(id),
      first_name: params.get('first_name') ?? '',
      last_name:  params.get('last_name')  ?? undefined,
      username:   params.get('username')   ?? undefined,
      photo_url:  params.get('photo_url')  ?? undefined,
      auth_date:  Number(params.get('auth_date')),
      hash,
    }

    authApi.telegramLogin(tgUser, refCode)
      .then((result) => {
        const r = result as { accessToken: string; isNewUser: boolean }
        localStorage.setItem('accessToken', r.accessToken)
        authTrack.completed(r.isNewUser ?? false)
        setIsNewUser(r.isNewUser ?? false)
        window.history.replaceState({}, '', '/auth')
        // Telegram Login Widget haqiqiy (tasdiqlangan) telefon bermaydi —
        // shuning uchun bu yerda umuman so'ralmaydi. Tasdiqlangan telefon
        // FAQAT profil sahifasidagi bot orqali (request_contact) olinadi
        setStep('done')
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Telegram orqali kirish muvaffaqiyatsiz')
        setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Login'dan keyin yo'naltirish: kelgan sahifa > (yangi user: match wizard) > profil
  useEffect(() => {
    if (step === 'done') {
      const dest = nextUrl ?? (isNewUser ? '/match?next=/profile' : '/profile')
      const timer = setTimeout(() => { window.location.href = dest }, 1600)
      return () => clearTimeout(timer)
    }
  }, [step, nextUrl, isNewUser])

  // Tark etish kuzatuvi (unmount)
  useEffect(() => {
    return () => {
      if (step !== 'done') authTrack.abandoned(step)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // OTP inputga focus
  useEffect(() => {
    if (step === 'otp') otpRef.current?.focus()
  }, [step])

  // Telegram widget yuklash (redirect mode) — step 'phone' ga har safar o'tganda qayta yuklanadi
  useEffect(() => {
    if (step !== 'phone' || !BOT_USERNAME) return

    const container = tgRef.current
    if (!container) return

    container.innerHTML = ''

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', BOT_USERNAME)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-radius', '12')
    // Redirect mode: Telegram /auth?id=...&hash=... ga qaytadi.
    // next/ref parametrlarini auth-url'da saqlaymiz — redirect'dan keyin ham yo'qolmasin
    const authUrlParams = new URLSearchParams()
    if (nextUrl) authUrlParams.set('next', nextUrl)
    if (refCode) authUrlParams.set('ref', refCode)
    const authUrlQuery = authUrlParams.toString()
    script.setAttribute(
      'data-auth-url',
      window.location.origin + '/auth' + (authUrlQuery ? `?${authUrlQuery}` : ''),
    )
    script.setAttribute('data-request-access', 'write')
    script.async = true
    container.appendChild(script)

    // Widget iframe sifatida qo'shiladi — chiqqanini kuzatib turamiz
    setTgReady(false)
    const check = setInterval(() => {
      if (container.querySelector('iframe')) {
        setTgReady(true)
        clearInterval(check)
      }
    }, 300)
    const stop = setTimeout(() => clearInterval(check), 6000)

    return () => {
      clearInterval(check)
      clearTimeout(stop)
      container.innerHTML = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  // Google Identity Services tugmasini yuklash
  useEffect(() => {
    if (step !== 'phone' || !GOOGLE_CLIENT_ID) return
    const container = googleRef.current
    if (!container) return

    function renderGoogleButton() {
      if (!window.google || !googleRef.current) return
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          setLoading(true)
          setError('')
          authApi.googleLogin(response.credential, refCode)
            .then((result) => {
              const r = result as { accessToken: string; isNewUser: boolean }
              localStorage.setItem('accessToken', r.accessToken)
              authTrack.completed(r.isNewUser ?? false)
              setIsNewUser(r.isNewUser ?? false)
              setStep('done')
            })
            .catch((err: unknown) => {
              setError(err instanceof Error ? err.message : 'Google orqali kirish muvaffaqiyatsiz')
              setLoading(false)
            })
        },
      })
      window.google.accounts.id.renderButton(googleRef.current, {
        theme: 'outline', size: 'large', shape: 'pill', width: 296,
      })
    }

    // Skript allaqachon yuklangan bo'lsa qayta qo'shmaymiz
    if (window.google) {
      renderGoogleButton()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = renderGoogleButton
    document.head.appendChild(script)

    return () => { if (container) container.innerHTML = '' }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  const ui = {
    title:      { uz: "Ta'lim muassasangizni toping", ru: 'Найдите своё учебное заведение' },
    subtitle:   { uz: "Kirish yoki ro'yxatdan o'tish", ru: 'Войти или зарегистрироваться' },
    otpSub:     { uz: 'SMS kodni kiriting', ru: 'Введите SMS-код' },
    phoneLabel: { uz: 'Telefon raqamingiz', ru: 'Ваш номер телефона' },
    sendBtn:    { uz: 'SMS kod olish', ru: 'Получить SMS-код' },
    sending:    { uz: 'Yuborilmoqda...', ru: 'Отправляется...' },
    otpLabel:   { uz: '6 xonali SMS kod', ru: '6-значный SMS-код' },
    otpInfo:    { uz: 'raqamiga SMS kod yuborildi', ru: 'отправлен SMS-код' },
    confirmBtn: { uz: 'Tasdiqlash', ru: 'Подтвердить' },
    checking:   { uz: 'Tekshirilmoqda...', ru: 'Проверяется...' },
    resend:     { uz: 'Kodni qayta yuborish', ru: 'Отправить код снова' },
    resendIn:   { uz: 'Qayta yuborish', ru: 'Повторить через' },
    back:       { uz: '← Raqamni o\'zgartirish', ru: '← Изменить номер' },
    doneTitle:  { uz: 'Muvaffaqiyatli kirdingiz!', ru: 'Вы успешно вошли!' },
    doneSub:      { uz: 'Profilingizga o\'tasiz...', ru: 'Переходим в профиль...' },
    doneSubBack:  { uz: 'Sahifangizga qaytmoqdasiz...', ru: 'Возвращаемся на страницу...' },
    doneSubMatch: { uz: 'Sizga mosini topamiz...', ru: 'Подберём подходящее...' },
    terms:      { uz: 'Kirish orqali siz ', ru: 'Входя, вы соглашаетесь с ' },
    termsLink:  { uz: 'foydalanish shartlari', ru: 'условиями использования' },
    termsEnd:   { uz: 'ga rozilik bildirasiz', ru: '' },
    orDivider:  { uz: 'yoki', ru: 'или' },
    quickLogin: { uz: 'Bir bosishda kiring', ru: 'Войдите в один клик' },
    noPassword: { uz: "Parol kerak emas — Telegram yoki Google orqali", ru: 'Без пароля — через Telegram или Google' },
    trustBadge: { uz: "Ma'lumotlaringiz xavfsiz saqlanadi", ru: 'Ваши данные надёжно защищены' },
    benefits: [
      { Icon: Star,           uz: 'Muassasalarni saqlang', ru: 'Сохраняйте учреждения' },
      { Icon: PencilLine,     uz: 'Sharh yozing',           ru: 'Оставляйте отзывы' },
      { Icon: ArrowLeftRight, uz: 'Solishtiring',           ru: 'Сравнивайте' },
    ],
  }

  // 60 soniyalik qayta yuborish taymerini boshlash
  function startCountdown() {
    setCountdown(60)
    const timer = setInterval(() => {
      setCountdown((c) => { if (c <= 1) { clearInterval(timer); return 0 } return c - 1 })
    }, 1000)
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      authTrack.phoneEntered()
      await authApi.sendOtp(phone.replace(/\s/g, ''))
      authTrack.otpSent()
      setStep('otp')
      setOtp('')
      startCountdown()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t(lang, { uz: 'Xatolik yuz berdi', ru: 'Произошла ошибка' }))
    } finally {
      setLoading(false)
    }
  }

  // OTP kodni qayta yuborish — telefon bosqichiga qaytmasdan
  async function handleResend() {
    setError('')
    setOtp('')
    setLoading(true)
    try {
      await authApi.sendOtp(phone.replace(/\s/g, ''))
      authTrack.otpSent()
      startCountdown()
      otpRef.current?.focus()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t(lang, { uz: 'Xatolik yuz berdi', ru: 'Произошла ошибка' }))
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await authApi.verifyOtp(phone.replace(/\s/g, ''), otp, refCode) as {
        accessToken: string; isNewUser: boolean
      }
      localStorage.setItem('accessToken', result.accessToken)
      authTrack.completed(result.isNewUser ?? false)
      setIsNewUser(result.isNewUser ?? false)
      setStep('done')
    } catch (err: unknown) {
      authTrack.otpError(1)
      setError(err instanceof Error ? err.message : t(lang, { uz: "OTP noto'g'ri", ru: 'Неверный код' }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* Left panel — desktop only */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-primary-800 via-primary-700 to-primary-900 px-12 text-white">
        {/* Decorative glow orbs */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 animate-float-slow rounded-full bg-primary-400/30 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 top-1/3 h-64 w-64 animate-float-delay rounded-full bg-sky-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/4 h-80 w-80 animate-float rounded-full bg-primary-500/25 blur-3xl" />
        {/* Subtle dot grid texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '26px 26px' }}
        />

        <div className="relative z-10 flex w-full max-w-sm flex-col items-center">
          <Link href="/" className="mb-10 flex items-center justify-center">
            <Logo size={52} inverted />
          </Link>
          <h2 className="mb-3 text-center text-3xl font-bold leading-snug tracking-tight">
            {t(lang, ui.title)}
          </h2>
          <p className="mb-10 text-center text-primary-100/90">
            {t(lang, { uz: "O'zbekiston ta'lim muassasalari — bir joyda", ru: 'Учебные заведения Узбекистана — в одном месте' })}
          </p>
          <div className="w-full space-y-3">
            {ui.benefits.map((b) => (
              <div
                key={b.uz}
                className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[0.07] px-5 py-4 backdrop-blur-sm transition-colors hover:bg-white/[0.12]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                  <b.Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <span className="font-semibold">{lang === 'uz' ? b.uz : b.ru}</span>
              </div>
            ))}
          </div>
          <div className="mt-10 flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-primary-100">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            {t(lang, { uz: 'Telegram yoki Google — parol kerak emas', ru: 'Telegram или Google — без пароля' })}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="mb-6 text-center lg:hidden">
            <Link href="/" className="inline-flex items-center justify-center">
              <Logo size={44} />
            </Link>
          </div>

          {/* Lang toggle */}
          <div className="mb-6 flex justify-center">
            <div className="flex rounded-full border border-gray-200 bg-white p-1 shadow-sm">
              {(['uz', 'ru'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                    lang === l
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {l === 'uz' ? "🇺🇿 O'zbek" : '🇷🇺 Русский'}
                </button>
              ))}
            </div>
          </div>

          <div className="animate-slide-up relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 shadow-xl shadow-gray-900/[0.04]">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-500 via-sky-400 to-primary-600" />

            <div className="mb-6 text-center">
              <h1 className="text-xl font-bold text-gray-900">
                {step === 'done'
                  ? t(lang, ui.doneTitle)
                  : step === 'otp'
                  ? t(lang, ui.otpSub)
                  : t(lang, ui.subtitle)}
              </h1>
              {step === 'phone' && (
                <p className="mt-1.5 text-sm text-gray-400">{t(lang, ui.noPassword)}</p>
              )}
            </div>

            {/* ── Phone step ── */}
            {step === 'phone' && (
              <div className="space-y-4">

                {/* Rozilik checkbox — ma'lumotlarning tanlangan ta'lim
                    muassasalariga uzatilishi haqida aniq va oldindan rozilik
                    (implicit "davom etish orqali roziman" emas) */}
                <div className="flex items-start gap-2.5 rounded-2xl border border-gray-200 bg-gray-50/70 px-4 py-3.5 text-xs leading-relaxed text-gray-600">
                  <input
                    id="consent-checkbox"
                    type="checkbox"
                    checked={consentChecked}
                    onChange={(e) => setConsentChecked(e.target.checked)}
                    className="mt-0.5 h-[18px] w-[18px] shrink-0 rounded-md border-gray-300 text-primary-600 accent-primary-600 focus:ring-2 focus:ring-primary-200"
                  />
                  <label htmlFor="consent-checkbox" className="cursor-pointer select-none">
                    {lang === 'uz' ? (
                      <>
                        Men{' '}
                        <Link href="/privacy" target="_blank" className="font-semibold text-primary-600 hover:underline">
                          Maxfiylik siyosati
                        </Link>{' '}
                        va{' '}
                        <Link href="/terms" target="_blank" className="font-semibold text-primary-600 hover:underline">
                          foydalanish shartlari
                        </Link>
                        ga tanishdim, shaxsiy ma&apos;lumotlarim (ism, telefon) tanlagan ta&apos;lim
                        muassasalariga uzatilishiga roziman.
                      </>
                    ) : (
                      <>
                        Я ознакомлен(а) с{' '}
                        <Link href="/privacy" target="_blank" className="font-semibold text-primary-600 hover:underline">
                          Политикой конфиденциальности
                        </Link>{' '}
                        и{' '}
                        <Link href="/terms" target="_blank" className="font-semibold text-primary-600 hover:underline">
                          условиями использования
                        </Link>
                        , и даю согласие на передачу моих данных (имя, телефон) выбранным учебным заведениям.
                      </>
                    )}
                  </label>
                </div>

                {/* Telegram + Google — bir bosishda kirish. Rozilik
                    belgilanmaguncha bloklangan (pointer-events-none) */}
                <div className={`space-y-3 transition-opacity ${consentChecked ? '' : 'pointer-events-none opacity-40'}`}>
                  <p className="px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {t(lang, ui.quickLogin)}
                  </p>
                  {loading ? (
                    <div className="flex justify-center py-3">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
                    </div>
                  ) : (
                    <>
                      {BOT_USERNAME && (
                        <div className="flex min-h-[52px] items-center justify-center rounded-2xl border border-gray-200 bg-white p-1.5 shadow-sm transition-all hover:border-primary-200 hover:shadow-md">
                          <div ref={tgRef} className="flex items-center justify-center" />
                        </div>
                      )}
                      {GOOGLE_CLIENT_ID && (
                        <div className="flex min-h-[52px] items-center justify-center rounded-2xl border border-gray-200 bg-white p-1.5 shadow-sm transition-all hover:border-primary-200 hover:shadow-md">
                          <div ref={googleRef} className="flex items-center justify-center" />
                        </div>
                      )}
                    </>
                  )}
                  {error && <ErrorBox msg={error} />}
                </div>

                {/* Ajratuvchi — faqat yuqorida haqiqiy muqobil (Telegram/Google) turgan bo'lsa
                    VA pastda SMS forma ko'rsatilsa (hozircha PHONE_AUTH_ENABLED=false) */}
                {PHONE_AUTH_ENABLED && (tgReady || GOOGLE_CLIENT_ID) && (
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-gray-200" />
                    <span className="text-xs font-semibold uppercase text-gray-400">{t(lang, ui.orDivider)}</span>
                    <div className="h-px flex-1 bg-gray-200" />
                  </div>
                )}

                {/* SMS form — Playmobile shartnomasi bo'lmagani uchun vaqtincha yashirilgan */}
                {PHONE_AUTH_ENABLED && (
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                        {t(lang, ui.phoneLabel)}
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                          const val = e.target.value
                          if (!val.startsWith('+998')) { setPhone('+998 '); return }
                          setPhone(val)
                        }}
                        placeholder="+998 90 123 45 67"
                        required
                        className="input text-lg"
                      />
                      <p className="mt-1 text-xs text-gray-400">
                        {t(lang, { uz: "Faqat O'zbekiston raqamlari (+998)", ru: 'Только номера Узбекистана (+998)' })}
                      </p>
                    </div>
                    <button
                      type="submit"
                      disabled={loading || phone.replace(/\D/g, '').length < 12}
                      className="btn-primary w-full"
                    >
                      {loading ? t(lang, ui.sending) : t(lang, ui.sendBtn)}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* ── OTP step ── */}
            {step === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="flex items-center gap-3 rounded-2xl border border-primary-100 bg-primary-50/70 px-4 py-3.5 text-sm text-primary-800">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-100">
                    <Smartphone className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <span>
                    <strong>{phone}</strong> {t(lang, ui.otpInfo)}
                  </span>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    {t(lang, ui.otpLabel)}
                  </label>
                  <input
                    ref={otpRef}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '')
                      setOtp(val)
                      if (val.length === 6) {
                        setTimeout(() => {
                          (e.target.closest('form') as HTMLFormElement)?.requestSubmit()
                        }, 100)
                      }
                    }}
                    placeholder="• • • • • •"
                    className="w-full rounded-2xl border border-gray-300 px-4 py-3.5 text-center text-2xl font-mono font-bold tracking-[0.4em] text-gray-900 shadow-sm outline-none transition-all focus:border-primary-500 focus:ring-4 focus:ring-primary-100 sm:text-3xl sm:tracking-[0.5em]"
                  />
                  <div className="mt-2.5 flex justify-center gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-2 w-2 rounded-full transition-all ${
                          i < otp.length ? 'scale-125 bg-primary-600' : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {error && <ErrorBox msg={error} />}

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="btn-primary w-full"
                >
                  {loading ? t(lang, ui.checking) : t(lang, ui.confirmBtn)}
                </button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => { setStep('phone'); setOtp(''); setError('') }}
                    className="font-medium text-gray-500 transition-colors hover:text-gray-700"
                  >
                    {t(lang, ui.back)}
                  </button>
                  {countdown > 0 ? (
                    <span className="text-gray-400">
                      {t(lang, ui.resendIn)}: <strong className="text-gray-600">{countdown}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={loading}
                      className="font-semibold text-primary-600 transition-colors hover:text-primary-700 hover:underline disabled:opacity-50"
                    >
                      {t(lang, ui.resend)}
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* ── Done ── */}
            {step === 'done' && (
              <div className="animate-fade-in py-4 text-center">
                <div className="mb-4 flex justify-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/60">
                    <CheckCircle2 className="h-9 w-9 text-emerald-500" strokeWidth={1.75} />
                  </span>
                </div>
                <p className="text-gray-600">
                  {t(lang, nextUrl ? ui.doneSubBack : isNewUser ? ui.doneSubMatch : ui.doneSub)}
                </p>
                <div className="mt-4 flex justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
                </div>
              </div>
            )}
          </div>

          {step === 'phone' && (
            <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-400">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              {t(lang, ui.trustBadge)}
            </div>
          )}

          <p className="mt-3 text-center text-xs text-gray-400">
            {t(lang, ui.terms)}
            <Link href="/terms" className="text-primary-600 hover:underline">
              {t(lang, ui.termsLink)}
            </Link>
            {lang === 'uz' && t(lang, ui.termsEnd)}
          </p>

          <a
            href="https://t.me/TrustboxInc"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-400 transition-colors hover:text-primary-600"
          >
            <Send className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            {t(lang, { uz: 'Yordam kerakmi? @TrustboxInc', ru: 'Нужна помощь? @TrustboxInc' })}
          </a>
        </div>
      </div>
    </div>
  )
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
      <span>{msg}</span>
    </div>
  )
}
