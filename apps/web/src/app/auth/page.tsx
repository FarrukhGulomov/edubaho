'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { authApi } from '@/lib/api'
import { useLang, t } from '@/contexts/LangContext'
import { authTrack } from '@/lib/analytics'

type Step = 'phone' | 'otp' | 'done'

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? 'edubahobot'

export default function AuthPage() {
  const { lang, setLang } = useLang()
  const [step, setStep]       = useState<Step>('phone')
  const [phone, setPhone]     = useState('+998 ')
  const [otp, setOtp]         = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [countdown, setCountdown] = useState(0)
  const otpRef  = useRef<HTMLInputElement>(null)
  const tgRef   = useRef<HTMLDivElement>(null)

  // Auth sahifasi ochildi
  useEffect(() => { authTrack.started() }, [])

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

    authApi.telegramLogin(tgUser)
      .then((result) => {
        const r = result as { accessToken: string; refreshToken: string; isNewUser: boolean }
        localStorage.setItem('accessToken', r.accessToken)
        localStorage.setItem('refreshToken', r.refreshToken)
        authTrack.completed(r.isNewUser ?? false)
        window.history.replaceState({}, '', '/auth')
        setStep('done')
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Telegram orqali kirish muvaffaqiyatsiz')
        setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Profilga o'tish
  useEffect(() => {
    if (step === 'done') {
      const timer = setTimeout(() => { window.location.href = '/profile' }, 1600)
      return () => clearTimeout(timer)
    }
  }, [step])

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
    // Redirect mode: Telegram /auth?id=...&hash=... ga qaytadi
    script.setAttribute('data-auth-url', window.location.origin + '/auth')
    script.setAttribute('data-request-access', 'write')
    script.async = true
    container.appendChild(script)

    return () => { container.innerHTML = '' }
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
    doneSub:    { uz: 'Profilingizga o\'tasiz...', ru: 'Переходим в профиль...' },
    terms:      { uz: 'Kirish orqali siz ', ru: 'Входя, вы соглашаетесь с ' },
    termsLink:  { uz: 'foydalanish shartlari', ru: 'условиями использования' },
    termsEnd:   { uz: 'ga rozilik bildirasiz', ru: '' },
    orDivider:  { uz: 'yoki', ru: 'или' },
    benefits: [
      { icon: '⭐', uz: 'Muassasalarni saqlang', ru: 'Сохраняйте учреждения' },
      { icon: '✍️', uz: 'Sharh yozing', ru: 'Оставляйте отзывы' },
      { icon: '⇄', uz: 'Solishtiring', ru: 'Сравнивайте' },
    ],
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
      setCountdown(60)
      const timer = setInterval(() => {
        setCountdown((c) => { if (c <= 1) { clearInterval(timer); return 0 } return c - 1 })
      }, 1000)
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
      const result = await authApi.verifyOtp(phone.replace(/\s/g, ''), otp) as {
        accessToken: string; refreshToken: string; isNewUser: boolean
      }
      localStorage.setItem('accessToken', result.accessToken)
      localStorage.setItem('refreshToken', result.refreshToken)
      authTrack.completed(result.isNewUser ?? false)
      setStep('done')
    } catch (err: unknown) {
      authTrack.otpError(1)
      setError(err instanceof Error ? err.message : t(lang, { uz: "OTP noto'g'ri", ru: 'Неверный код' }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-primary-50 to-white">

      {/* Left panel — desktop only */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800 px-12 text-white">
        <Link href="/" className="mb-8 flex items-center gap-3 text-3xl font-black">
          <span>🎓</span> EduReyting.uz
        </Link>
        <h2 className="mb-3 text-2xl font-bold text-center leading-snug">
          {t(lang, ui.title)}
        </h2>
        <p className="mb-10 text-primary-200 text-center">
          {t(lang, { uz: "O'zbekistondagi 500+ muassasa", ru: '500+ учреждений Узбекистана' })}
        </p>
        <div className="w-full space-y-3">
          {ui.benefits.map((b) => (
            <div key={b.icon} className="flex items-center gap-3 rounded-2xl bg-white/15 px-5 py-3.5">
              <span className="text-2xl">{b.icon}</span>
              <span className="font-semibold">{lang === 'uz' ? b.uz : b.ru}</span>
            </div>
          ))}
        </div>
        <p className="mt-10 text-xs text-primary-300">
          {t(lang, { uz: 'Telegram yoki SMS — parol kerak emas', ru: 'Telegram или SMS — без пароля' })}
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="mb-6 text-center lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2 text-2xl font-black text-primary-600">
              <span>🎓</span> EduReyting.uz
            </Link>
          </div>

          {/* Lang toggle */}
          <div className="mb-6 flex justify-center">
            <div className="flex rounded-xl border border-gray-200 bg-white p-1">
              {(['uz', 'ru'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`rounded-lg px-5 py-2 text-sm font-bold transition-all ${
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

          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="mb-6 text-center">
              <h1 className="text-xl font-black text-gray-900">
                {step === 'done'
                  ? t(lang, ui.doneTitle)
                  : step === 'otp'
                  ? t(lang, ui.otpSub)
                  : t(lang, ui.subtitle)}
              </h1>
            </div>

            {/* ── Phone step ── */}
            {step === 'phone' && (
              <div className="space-y-4">

                {/* Telegram Login Widget */}
                {BOT_USERNAME && (
                  <div className="space-y-3">
                    <div
                      ref={tgRef}
                      className="flex justify-center min-h-[48px] items-center"
                    />
                    {loading && (
                      <div className="flex justify-center">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
                      </div>
                    )}
                    {error && <ErrorBox msg={error} />}

                    {/* Divider */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-white px-3 text-gray-400 font-medium">
                          {t(lang, ui.orDivider)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* SMS form */}
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
                      className="w-full rounded-xl border border-gray-300 px-4 py-3.5 text-lg text-gray-900 outline-none placeholder:text-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      {t(lang, { uz: "Faqat O'zbekiston raqamlari (+998)", ru: 'Только номера Узбекистана (+998)' })}
                    </p>
                  </div>

                  {!BOT_USERNAME && error && <ErrorBox msg={error} />}

                  <button
                    type="submit"
                    disabled={loading || phone.replace(/\D/g, '').length < 12}
                    className="w-full rounded-xl bg-primary-600 py-3.5 font-bold text-white hover:bg-primary-700 disabled:opacity-50 transition-colors text-base"
                  >
                    {loading ? t(lang, ui.sending) : t(lang, ui.sendBtn)}
                  </button>
                </form>
              </div>
            )}

            {/* ── OTP step ── */}
            {step === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  <span className="text-lg">📱</span>
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
                    className="w-full rounded-xl border-2 border-gray-300 px-4 py-4 text-center text-3xl font-mono font-bold tracking-[0.5em] text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />
                  <div className="mt-2 flex justify-center gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-2 w-2 rounded-full transition-all ${
                          i < otp.length ? 'bg-primary-600 scale-125' : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {error && <ErrorBox msg={error} />}

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full rounded-xl bg-primary-600 py-3.5 font-bold text-white hover:bg-primary-700 disabled:opacity-50 transition-colors text-base"
                >
                  {loading ? t(lang, ui.checking) : t(lang, ui.confirmBtn)}
                </button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => { setStep('phone'); setOtp(''); setError('') }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {t(lang, ui.back)}
                  </button>
                  {countdown > 0 ? (
                    <span className="text-gray-400">
                      {t(lang, ui.resendIn)}: <strong>{countdown}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setStep('phone'); setOtp('') }}
                      className="font-semibold text-primary-600 hover:underline"
                    >
                      {t(lang, ui.resend)}
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* ── Done ── */}
            {step === 'done' && (
              <div className="text-center py-4">
                <div className="mb-4 text-6xl animate-bounce">✅</div>
                <p className="text-gray-600">{t(lang, ui.doneSub)}</p>
                <div className="mt-4 flex justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
                </div>
              </div>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-gray-400">
            {t(lang, ui.terms)}
            <Link href="/terms" className="text-primary-600 hover:underline">
              {t(lang, ui.termsLink)}
            </Link>
            {lang === 'uz' && t(lang, ui.termsEnd)}
          </p>
        </div>
      </div>
    </div>
  )
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
      <span className="mt-0.5 shrink-0">⚠️</span>
      <span>{msg}</span>
    </div>
  )
}
