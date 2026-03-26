'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

type Step = 'phone' | 'otp' | 'pin' | 'done'

export default function AdminLoginPage() {
  const router = useRouter()
  const [step, setStep]       = useState<Step>('phone')
  const [phone, setPhone]     = useState('+998 ')
  const [otp, setOtp]         = useState('')
  const [pin, setPin]         = useState('')
  const [role, setRole]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [countdown, setCount] = useState(0)
  const otpRef = useRef<HTMLInputElement>(null)
  const pinRef = useRef<HTMLInputElement>(null)

  // Allaqachon kirgan adminni /admin ga yo'naltirish
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    fetch(`${API}/auth/admin-check`, {
      headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' },
    })
      .then(r => r.json())
      .then(d => {
        if (d.verified) router.replace('/admin')
      })
      .catch(() => {})
  }, [router])

  useEffect(() => {
    if (step === 'otp') otpRef.current?.focus()
    if (step === 'pin') pinRef.current?.focus()
  }, [step])

  // ── 1-qadam: OTP yuborish ──
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.sendOtp(phone.replace(/\s/g, ''))
      setStep('otp')
      setCount(60)
      const t = setInterval(() => setCount(c => { if (c <= 1) { clearInterval(t); return 0 } return c - 1 }), 1000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Xatolik yuz berdi')
    } finally {
      setLoading(false)
    }
  }

  // ── 2-qadam: OTP tasdiqlash ──
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await authApi.verifyOtp(phone.replace(/\s/g, ''), otp) as {
        accessToken: string; refreshToken: string; user: { role: string }
      }

      // Token saqlash
      localStorage.setItem('accessToken', result.accessToken)
      localStorage.setItem('refreshToken', result.refreshToken)

      const userRole = result.user?.role
      if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        setError("Sizda admin huquqi yo'q. Ushbu sahifa faqat adminlar uchun.")
        setStep('phone')
        return
      }

      setRole(userRole)
      setStep('pin')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "OTP noto'g'ri")
    } finally {
      setLoading(false)
    }
  }

  // ── 3-qadam: Admin PIN tasdiqlash ──
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
      setError('Server bilan aloqa yo\'q')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">

          {/* Logo */}
          <div className="mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2 text-2xl font-black text-white">
              🎓 EduReyting.uz
            </Link>
            <div className="mt-2 flex justify-center">
              <span className="rounded-full bg-purple-900/60 px-4 py-1 text-xs font-bold text-purple-300 border border-purple-800">
                🛡️ ADMIN KIRISH
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-8 shadow-2xl">

            {/* Progress steps */}
            <div className="mb-6 flex items-center justify-center gap-2">
              {(['phone', 'otp', 'pin'] as const).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    step === s ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/40'
                    : (step === 'otp' && i === 0) || (step === 'pin' && i <= 1) || step === 'done'
                      ? 'bg-green-500 text-white'
                      : 'bg-white/10 text-white/40'
                  }`}>
                    {((step === 'otp' && i === 0) || (step === 'pin' && i <= 1) || step === 'done')
                      ? '✓' : i + 1}
                  </div>
                  {i < 2 && <div className={`h-px w-8 transition-all ${
                    (step === 'pin' && i === 0) || (step === 'done' && i <= 1) ? 'bg-green-500' : 'bg-white/10'
                  }`} />}
                </div>
              ))}
            </div>

            {/* ── Step 1: Phone ── */}
            {step === 'phone' && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="text-center mb-4">
                  <h1 className="text-lg font-bold text-white">Telefon raqamingiz</h1>
                  <p className="text-xs text-white/50 mt-1">Admin panelga kirish uchun</p>
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => {
                    const v = e.target.value
                    if (!v.startsWith('+998')) { setPhone('+998 '); return }
                    setPhone(v)
                  }}
                  placeholder="+998 90 123 45 67"
                  required
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3.5 text-lg text-white outline-none placeholder:text-white/30 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all"
                />
                {error && <ErrorBox msg={error} />}
                <button
                  type="submit"
                  disabled={loading || phone.replace(/\D/g, '').length < 12}
                  className="w-full rounded-xl bg-purple-600 py-3.5 font-bold text-white hover:bg-purple-500 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Yuborilmoqda...' : 'SMS kod olish'}
                </button>
              </form>
            )}

            {/* ── Step 2: OTP ── */}
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
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, '')
                    setOtp(v)
                    if (v.length === 6) {
                      setTimeout(() => (e.target.closest('form') as HTMLFormElement)?.requestSubmit(), 100)
                    }
                  }}
                  placeholder="• • • • • •"
                  className="w-full rounded-xl border-2 border-white/20 bg-white/10 px-4 py-4 text-center text-3xl font-mono font-bold tracking-[0.5em] text-white outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all"
                />
                <div className="flex justify-center gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={`h-2 w-2 rounded-full transition-all ${i < otp.length ? 'bg-purple-400 scale-125' : 'bg-white/20'}`} />
                  ))}
                </div>
                {error && <ErrorBox msg={error} />}
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full rounded-xl bg-purple-600 py-3.5 font-bold text-white hover:bg-purple-500 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Tekshirilmoqda...' : 'Tasdiqlash'}
                </button>
                <div className="flex items-center justify-between text-sm">
                  <button type="button" onClick={() => { setStep('phone'); setOtp(''); setError('') }}
                    className="text-white/40 hover:text-white/70 transition-colors">
                    ← Orqaga
                  </button>
                  {countdown > 0
                    ? <span className="text-white/40">Qayta: <strong className="text-white/60">{countdown}s</strong></span>
                    : <button type="button" onClick={() => { setStep('phone'); setOtp('') }}
                        className="font-semibold text-purple-400 hover:text-purple-300 transition-colors">
                        Qayta yuborish
                      </button>
                  }
                </div>
              </form>
            )}

            {/* ── Step 3: Admin PIN ── */}
            {step === 'pin' && (
              <form onSubmit={handleVerifyPin} className="space-y-4">
                <div className="text-center mb-4">
                  <div className="mb-2 text-3xl">{role === 'SUPER_ADMIN' ? '👑' : '🛡️'}</div>
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
                  className="w-full rounded-xl border-2 border-white/20 bg-white/10 px-4 py-3.5 text-center text-2xl font-mono tracking-widest text-white outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all placeholder:text-white/30"
                />
                <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-300">
                  🔒 Bu PIN faqat admin va super adminlarga berilgan maxfiy raqam
                </div>
                {error && <ErrorBox msg={error} />}
                <button
                  type="submit"
                  disabled={loading || pin.length < 4}
                  className="w-full rounded-xl bg-purple-600 py-3.5 font-bold text-white hover:bg-purple-500 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Tekshirilmoqda...' : '🔓 Admin paneliga kirish'}
                </button>
              </form>
            )}

            {/* ── Done ── */}
            {step === 'done' && (
              <div className="py-6 text-center">
                <div className="mb-4 text-6xl animate-bounce">✅</div>
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
      <span className="mt-0.5 shrink-0">⚠️</span>
      <span>{msg}</span>
    </div>
  )
}
