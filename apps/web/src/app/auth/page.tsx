'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { CheckCircle2, AlertCircle, Smartphone, ArrowLeft, Bookmark, PencilLine, BarChart3 } from 'lucide-react'
import { authApi } from '@/lib/api'
import { useLang, t } from '@/contexts/LangContext'
import { authTrack } from '@/lib/analytics'
import Logo from '@/components/shared/Logo'

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

  useEffect(() => { authTrack.started() }, [])

  // Telegram redirect mode
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

  useEffect(() => {
    if (step === 'done') {
      const timer = setTimeout(() => { window.location.href = '/profile' }, 1600)
      return () => clearTimeout(timer)
    }
  }, [step])

  useEffect(() => {
    return () => {
      if (step !== 'done') authTrack.abandoned(step)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (step === 'otp') otpRef.current?.focus()
  }, [step])

  useEffect(() => {
    if (step !== 'phone' || !BOT_USERNAME) return
    const container = tgRef.current
    if (!container) return
    container.innerHTML = ''
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', BOT_USERNAME)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-radius', '8')
    script.setAttribute('data-auth-url', window.location.origin + '/auth')
    script.setAttribute('data-request-access', 'write')
    script.async = true
    container.appendChild(script)
    return () => { container.innerHTML = '' }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  const ui = {
    subtitle:   { uz: "Kirish yoki ro'yxatdan o'tish", ru: 'Войти или зарегистрироваться' },
    otpSub:     { uz: 'SMS kodni kiriting', ru: 'Введите SMS-код' },
    phoneLabel: { uz: 'Telefon raqamingiz', ru: 'Ваш номер телефона' },
    sendBtn:    { uz: 'SMS kod olish', ru: 'Получить SMS-код' },
    sending:    { uz: 'Yuborilmoqda...', ru: 'Отправляется...' },
    otpLabel:   { uz: '6 xonali SMS kod', ru: '6-значный SMS-код' },
    otpInfo:    { uz: 'raqamiga SMS kod yuborildi', ru: 'отправлен SMS-код' },
    confirmBtn: { uz: 'Tasdiqlash', ru: 'Подтвердить' },
    checking:   { uz: 'Tekshirilmoqda...', ru: 'Проверяется...' },
    resend:     { uz: 'Qayta yuborish', ru: 'Отправить снова' },
    resendIn:   { uz: 'Qayta yuborish', ru: 'Повторить через' },
    back:       { uz: 'Raqamni o\'zgartirish', ru: 'Изменить номер' },
    doneTitle:  { uz: 'Muvaffaqiyatli kirdingiz!', ru: 'Вы успешно вошли!' },
    doneSub:    { uz: 'Profilingizga o\'tasiz...', ru: 'Переходим в профиль...' },
    terms:      { uz: 'Kirish orqali siz ', ru: 'Входя, вы соглашаетесь с ' },
    termsLink:  { uz: 'foydalanish shartlari', ru: 'условиями использования' },
    termsEnd:   { uz: 'ga rozilik bildirasiz', ru: '' },
  }

  const benefits = [
    { icon: Bookmark,   uz: 'Muassasalarni saqlang', ru: 'Сохраняйте учреждения' },
    { icon: PencilLine, uz: 'Sharh yozing', ru: 'Оставляйте отзывы' },
    { icon: BarChart3,  uz: 'Solishtiring', ru: 'Сравнивайте' },
  ]

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
    <div className="flex min-h-dvh bg-canvas">

      {/* Left panel — desktop */}
      <div className="hidden flex-col items-center justify-center bg-primary-950 px-12 lg:flex lg:w-1/2">
        <Link href="/" className="mb-10 flex items-center justify-center">
          <Logo size={44} inverted />
        </Link>
        <h2 className="mb-2 text-center text-xl font-bold leading-snug text-white">
          {t(lang, { uz: "Ta'lim muassasangizni toping", ru: 'Найдите своё учебное заведение' })}
        </h2>
        <p className="mb-8 text-center text-sm text-white/45">
          {t(lang, { uz: "O'zbekistondagi 500+ muassasa", ru: '500+ учреждений Узбекистана' })}
        </p>
        <div className="w-full space-y-2">
          {benefits.map((b) => (
            <div key={b.uz} className="flex items-center gap-3 rounded-xl bg-white/8 px-4 py-3">
              <b.icon className="h-4 w-4 text-sky-400" aria-hidden />
              <span className="text-sm font-medium text-white/80">{lang === 'uz' ? b.uz : b.ru}</span>
            </div>
          ))}
        </div>
        <p className="mt-10 text-xs text-white/30">
          {t(lang, { uz: 'Telegram yoki SMS — parol kerak emas', ru: 'Telegram или SMS — без пароля' })}
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="mb-6 text-center lg:hidden">
            <Link href="/" className="inline-flex items-center justify-center">
              <Logo size={40} />
            </Link>
          </div>

          {/* Lang toggle */}
          <div className="mb-6 flex justify-center">
            <div className="flex rounded-xl border border-line bg-surface p-1">
              {(['uz', 'ru'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`rounded-lg px-5 py-2 text-sm font-semibold transition-all ${
                    lang === l
                      ? 'bg-primary-600 text-white shadow-card'
                      : 'text-mute hover:text-ink'
                  }`}
                  aria-pressed={lang === l}
                >
                  {l === 'uz' ? "O'zbek" : 'Русский'}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-7">
            <div className="mb-5 text-center">
              <h1 className="text-lg font-semibold text-ink">
                {step === 'done'
                  ? t(lang, ui.doneTitle)
                  : step === 'otp'
                  ? t(lang, ui.otpSub)
                  : t(lang, ui.subtitle)}
              </h1>
            </div>

            {/* Phone step */}
            {step === 'phone' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  {loading ? (
                    <div className="flex justify-center py-4">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-line-2 border-t-primary-600" />
                    </div>
                  ) : (
                    <div ref={tgRef} className="flex min-h-[48px] items-center justify-center" />
                  )}
                  {error && <ErrorBox msg={error} />}
                </div>
                {/* SMS form (hidden for now but logic preserved) */}
                {false && (
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div>
                      <label htmlFor="phone-input" className="mb-1.5 block text-sm font-medium text-ink">
                        {t(lang, ui.phoneLabel)}
                      </label>
                      <input
                        id="phone-input"
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                          const val = e.target.value
                          if (!val.startsWith('+998')) { setPhone('+998 '); return }
                          setPhone(val)
                        }}
                        placeholder="+998 90 123 45 67"
                        required
                        className="input"
                        autoComplete="tel"
                      />
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

            {/* OTP step */}
            {step === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="flex items-center gap-2.5 rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-800 dark:bg-primary-500/10 dark:text-primary-300">
                  <Smartphone className="h-4 w-4 shrink-0" aria-hidden />
                  <span>
                    <strong className="font-semibold">{phone}</strong> {t(lang, ui.otpInfo)}
                  </span>
                </div>

                <div>
                  <label htmlFor="otp-input" className="mb-1.5 block text-sm font-medium text-ink">
                    {t(lang, ui.otpLabel)}
                  </label>
                  <input
                    id="otp-input"
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
                    placeholder="000000"
                    autoComplete="one-time-code"
                    className="w-full rounded-xl border-2 border-line-2 bg-surface px-4 py-3.5 text-center font-mono text-2xl font-bold tracking-[0.5em] text-ink outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                  {/* Progress dots */}
                  <div className="mt-2 flex justify-center gap-2" aria-hidden>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 w-1.5 rounded-full transition-all duration-150 ${
                          i < otp.length ? 'scale-125 bg-primary-600' : 'bg-line-2'
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
                    className="flex items-center gap-1 text-mute transition-colors hover:text-ink"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                    {t(lang, ui.back)}
                  </button>
                  {countdown > 0 ? (
                    <span className="tabular-nums text-faint">
                      {t(lang, ui.resendIn)}: <strong className="text-mute">{countdown}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setStep('phone'); setOtp('') }}
                      className="font-medium text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-400"
                    >
                      {t(lang, ui.resend)}
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* Done */}
            {step === 'done' && (
              <div className="flex flex-col items-center py-4 text-center">
                <CheckCircle2 className="mb-4 h-12 w-12 text-accent-600 dark:text-accent-400" aria-hidden />
                <p className="text-sm text-mute">{t(lang, ui.doneSub)}</p>
                <div className="mt-4 h-5 w-5 animate-spin rounded-full border-2 border-line-2 border-t-primary-600" />
              </div>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-faint">
            {t(lang, ui.terms)}
            <Link href="/terms" className="font-medium text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-400">
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
    <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-400">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{msg}</span>
    </div>
  )
}
