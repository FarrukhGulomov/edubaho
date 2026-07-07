'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { GraduationCap, ShieldCheck, Info, Crown, Lock, Unlock, CheckCircle2, AlertCircle, Check } from 'lucide-react'
import { authApi } from '@/lib/api'

const API          = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'
const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? 'edubahobot'

type Step = 'auth' | 'otp' | 'pin' | 'done'

export default function AdminLoginPage() {
  const router = useRouter()
  const [step, setStep]       = useState<Step>('auth')
  const [role, setRole]       = useState('')
  const [pin, setPin]         = useState('')
  const [phone, setPhone]     = useState('+998')
  const [otp, setOtp]         = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const pinRef = useRef<HTMLInputElement>(null)
  const otpRef = useRef<HTMLInputElement>(null)
  const tgRef  = useRef<HTMLDivElement>(null)

  // Allaqachon kirgan foydalanuvchi holatini aniqlash:
  //  - admin_verified bo'lsa to'g'ridan-to'g'ri /admin ga
  //  - token bor va roli admin bo'lsa (masalan /auth orqali kirgan) PIN bosqichiga
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    fetch(`${API}/auth/admin-check`, {
      headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' },
    })
      .then(r => r.json())
      .then(d => {
        if (d.verified) { router.replace('/admin'); return }
        if (d.role === 'ADMIN' || d.role === 'SUPER_ADMIN') {
          setRole(d.role)
          setStep('pin')
        }
      })
      .catch(() => {})
  }, [router])

  // Telegram redirect mode — URL da hash parametri bo'lsa avtomatik login
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const hash   = params.get('hash')
    const id     = params.get('id')
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
        const r = result as {
          accessToken: string
          refreshToken: string
          user: { role: string }
        }
        localStorage.setItem('accessToken', r.accessToken)
        localStorage.setItem('refreshToken', r.refreshToken)

        const userRole = r.user?.role
        if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          setError("Sizda admin huquqi yo'q. Faqat adminlar kira oladi.")
          setLoading(false)
          return
        }

        window.history.replaceState({}, '', '/admin/login')
        setRole(userRole)
        setLoading(false)
        setStep('pin')
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Telegram orqali kirish muvaffaqiyatsiz')
        setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // PIN/OTP inputga focus
  useEffect(() => {
    if (step === 'pin') pinRef.current?.focus()
    if (step === 'otp') otpRef.current?.focus()
  }, [step])

  // ── Telefon + OTP orqali kirish (Telegram sozlanmagan bo'lsa ham ishlaydi) ──
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.sendOtp(phone.replace(/\s/g, ''))
      setStep('otp')
      setOtp('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Xatolik yuz berdi')
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
        accessToken: string; refreshToken: string; user: { role: string }
      }
      const userRole = result.user?.role
      if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
        setError("Sizda admin huquqi yo'q. Faqat adminlar kira oladi.")
        return
      }
      localStorage.setItem('accessToken', result.accessToken)
      localStorage.setItem('refreshToken', result.refreshToken)
      setRole(userRole)
      setStep('pin')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "OTP noto'g'ri")
    } finally {
      setLoading(false)
    }
  }

  // Telegram widget yuklash
  useEffect(() => {
    if (step !== 'auth' || !BOT_USERNAME) return
    const container = tgRef.current
    if (!container) return
    container.innerHTML = ''
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', BOT_USERNAME)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-radius', '12')
    script.setAttribute('data-auth-url', window.location.origin + '/admin/login')
    script.setAttribute('data-request-access', 'write')
    script.async = true
    container.appendChild(script)
    return () => { container.innerHTML = '' }
  }, [step])

  // ── Admin PIN tasdiqlash ──
  async function handleVerifyPin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`${API}/auth/admin-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'ngrok-skip-browser-warning': '1',
        },
        body: JSON.stringify({ pin }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "PIN noto'g'ri")
        setPin('')
        return
      }
      setStep('done')
      setTimeout(() => router.replace('/admin'), 1200)
    } catch {
      setError("Server bilan aloqa yo'q")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-900">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">

          {/* Logo */}
          <div className="mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold text-white">
              <GraduationCap className="h-6 w-6 shrink-0" strokeWidth={1.75} /> EDUBAHO.uz
            </Link>
            <div className="mt-2 flex justify-center">
              <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-purple-800 bg-purple-900/60 px-4 py-1 text-xs font-semibold text-purple-300">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} /> ADMIN KIRISH
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl">

            {/* Progress steps */}
            <div className="mb-6 flex items-center justify-center gap-2">
              {(['auth', 'pin'] as const).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    step === s || (s === 'auth' && step === 'otp')
                      ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/40'
                      : (step === 'pin' && i === 0) || step === 'done'
                        ? 'bg-green-500 text-white'
                        : 'bg-white/10 text-white/40'
                  }`}>
                    {((step === 'pin' && i === 0) || step === 'done') ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : i + 1}
                  </div>
                  {i < 1 && (
                    <div className={`h-px w-8 transition-all ${
                      step === 'pin' || step === 'done' ? 'bg-green-500' : 'bg-white/10'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            {/* ── Step 1: Telegram auth ── */}
            {step === 'auth' && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h1 className="text-lg font-bold text-white">Admin kirish</h1>
                  <p className="text-xs text-white/50 mt-1">Telegram orqali identifikatsiya</p>
                </div>

                {loading ? (
                  <div className="flex justify-center py-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-400/30 border-t-purple-400" />
                  </div>
                ) : (
                  <div className="flex justify-center min-h-[48px] items-center">
                    <div ref={tgRef} />
                  </div>
                )}

                {error && <ErrorBox msg={error} />}

                {/* Ajratuvchi */}
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-[10px] font-semibold uppercase text-white/30">yoki telefon</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                {/* Telefon + OTP — Telegram sozlanmagan muhitlar uchun */}
                <form onSubmit={handleSendOtp} className="space-y-3">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value
                      if (!val.startsWith('+998')) { setPhone('+998'); return }
                      setPhone(val)
                    }}
                    placeholder="+998 90 123 45 67"
                    required
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-purple-400 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={loading || phone.replace(/\D/g, '').length < 12}
                    className="w-full rounded-xl border border-purple-500/40 bg-purple-500/20 py-3 font-semibold text-purple-200 hover:bg-purple-500/30 disabled:opacity-40 transition-colors"
                  >
                    SMS kod olish
                  </button>
                </form>

                <div className="flex items-center justify-center gap-1.5 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-center text-xs text-blue-300">
                  <Info className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} /> Faqat admin huquqidagi akkauntlar kira oladi
                </div>
              </div>
            )}

            {/* ── Step 1b: OTP tasdiqlash ── */}
            {step === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="text-center mb-4">
                  <h1 className="text-lg font-bold text-white">SMS kodni kiriting</h1>
                  <p className="text-xs text-white/50 mt-1">{phone} raqamiga yuborildi</p>
                </div>
                <input
                  ref={otpRef}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3.5 text-center text-2xl font-mono tracking-[0.4em] text-white outline-none focus:border-purple-400 transition-colors placeholder:text-white/30"
                />
                {error && <ErrorBox msg={error} />}
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full rounded-xl bg-purple-600 py-3.5 font-semibold text-white hover:bg-purple-500 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Tekshirilmoqda...' : 'Tasdiqlash'}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep('auth'); setOtp(''); setError('') }}
                  className="w-full text-center text-xs text-white/40 hover:text-white/70 transition-colors"
                >
                  ← Raqamni o'zgartirish
                </button>
              </form>
            )}

            {/* ── Step 2: Admin PIN ── */}
            {step === 'pin' && (
              <form onSubmit={handleVerifyPin} className="space-y-4">
                <div className="text-center mb-4">
                  <div className="mb-2 flex justify-center">
                    {role === 'SUPER_ADMIN'
                      ? <Crown className="h-8 w-8 text-amber-400" strokeWidth={1.5} />
                      : <ShieldCheck className="h-8 w-8 text-purple-400" strokeWidth={1.5} />}
                  </div>
                  <h1 className="text-lg font-bold text-white">Admin PIN kodi</h1>
                  <p className="text-xs text-white/50 mt-1">
                    {role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'} uchun maxsus PIN
                  </p>
                </div>
                <input
                  ref={pinRef}
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="PIN kiriting"
                  required
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3.5 text-center text-2xl font-mono tracking-widest text-white outline-none focus:border-purple-400 transition-colors placeholder:text-white/30"
                />
                <div className="flex items-center gap-1.5 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-300">
                  <Lock className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} /> Bu PIN faqat admin va super adminlarga berilgan maxfiy raqam
                </div>
                {error && <ErrorBox msg={error} />}
                <button
                  type="submit"
                  disabled={loading || pin.length < 4}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3.5 font-semibold text-white hover:bg-purple-500 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Tekshirilmoqda...' : <><Unlock className="h-4 w-4 shrink-0" strokeWidth={1.75} /> Admin paneliga kirish</>}
                </button>
              </form>
            )}

            {/* ── Done ── */}
            {step === 'done' && (
              <div className="py-6 text-center">
                <div className="mb-4 flex justify-center">
                  <CheckCircle2 className="h-14 w-14 text-emerald-400" strokeWidth={1.5} />
                </div>
                <h2 className="font-bold text-white text-lg">Muvaffaqiyatli kirdingiz!</h2>
                <p className="text-white/50 text-sm mt-1">Admin panelga o&apos;tilmoqda...</p>
                <div className="mt-4 flex justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-400/30 border-t-purple-400" />
                </div>
              </div>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-white/30">
            Admin emassiz?{' '}
            <Link href="/" className="text-purple-400 hover:text-purple-300 transition-colors">
              Bosh sahifaga qaytish
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
      <span>{msg}</span>
    </div>
  )
}
