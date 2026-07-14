'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, Crown, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
import { authApi } from '@/lib/api'

const API          = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'
const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? 'edubahobot'

type Step = 'auth' | 'pin' | 'done'

export default function AdminLoginPage() {
  const router = useRouter()
  const [step, setStep]       = useState<Step>('auth')
  const [role, setRole]       = useState('')
  const [pin, setPin]         = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const pinRef = useRef<HTMLInputElement>(null)
  const tgRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    fetch(`${API}/auth/admin-check`, {
      headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' },
    })
      .then(r => r.json())
      .then(d => { if (d.verified) router.replace('/admin') })
      .catch(() => {})
  }, [router])

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
        const r = result as { accessToken: string; refreshToken: string; user: { role: string } }
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

  useEffect(() => {
    if (step === 'pin') pinRef.current?.focus()
  }, [step])

  useEffect(() => {
    if (step !== 'auth' || !BOT_USERNAME) return
    const container = tgRef.current
    if (!container) return
    container.innerHTML = ''
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', BOT_USERNAME)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-radius', '8')
    script.setAttribute('data-auth-url', window.location.origin + '/admin/login')
    script.setAttribute('data-request-access', 'write')
    script.async = true
    container.appendChild(script)
    return () => { container.innerHTML = '' }
  }, [step])

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

  const isSuperAdmin = role === 'SUPER_ADMIN'

  return (
    <div className="flex min-h-dvh bg-primary-950">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2 text-xl font-bold text-white">
              <ShieldCheck className="h-6 w-6 text-primary-400" aria-hidden />
              EDUBAHO.uz
            </Link>
            <div className="mt-2 flex justify-center">
              <span className="rounded-full border border-white/15 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-white/60">
                Admin kirish
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-7 shadow-2xl backdrop-blur-sm">
            {/* Steps indicator */}
            <div className="mb-6 flex items-center justify-center gap-2">
              {(['auth', 'pin'] as const).map((s, i) => {
                const done = (s === 'auth' && (step === 'pin' || step === 'done')) || step === 'done'
                const active = step === s
                return (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      done   ? 'bg-accent-500 text-white'
                      : active ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                      : 'bg-white/10 text-white/30'
                    }`}>
                      {done ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : i + 1}
                    </div>
                    {i < 1 && (
                      <div className={`h-px w-8 transition-all ${step !== 'auth' ? 'bg-accent-500' : 'bg-white/10'}`} />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Step 1: Telegram */}
            {step === 'auth' && (
              <div className="space-y-4">
                <div className="mb-4 text-center">
                  <h1 className="text-base font-bold text-white">Admin kirish</h1>
                  <p className="mt-1 text-xs text-white/40">Telegram orqali identifikatsiya</p>
                </div>
                {loading ? (
                  <div className="flex justify-center py-4">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-400/30 border-t-primary-400" />
                  </div>
                ) : (
                  <div className="flex min-h-[48px] items-center justify-center">
                    <div ref={tgRef} />
                  </div>
                )}
                {error && <AdminErrorBox msg={error} />}
                <div className="rounded-xl border border-primary-500/20 bg-primary-500/10 px-4 py-3 text-center text-xs text-primary-300">
                  Faqat admin huquqidagi Telegram akkauntlar kira oladi
                </div>
              </div>
            )}

            {/* Step 2: PIN */}
            {step === 'pin' && (
              <form onSubmit={handleVerifyPin} className="space-y-4">
                <div className="mb-4 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                    {isSuperAdmin
                      ? <Crown className="h-6 w-6 text-amber-400" aria-hidden />
                      : <ShieldCheck className="h-6 w-6 text-primary-400" aria-hidden />
                    }
                  </div>
                  <h1 className="text-base font-bold text-white">Admin PIN kodi</h1>
                  <p className="mt-1 text-xs text-white/40">
                    {isSuperAdmin ? 'Super Admin' : 'Admin'} uchun maxsus PIN
                  </p>
                </div>
                <input
                  ref={pinRef}
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="••••••"
                  required
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3.5 text-center font-mono text-2xl tracking-widest text-white outline-none placeholder:text-white/20 focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20 transition-all"
                  aria-label="Admin PIN kodi"
                />
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-300/80">
                  Bu PIN faqat admin va super adminlarga berilgan maxfiy raqam
                </div>
                {error && <AdminErrorBox msg={error} />}
                <button
                  type="submit"
                  disabled={loading || pin.length < 4}
                  className="w-full rounded-xl bg-primary-600 py-3 font-semibold text-white transition-colors hover:bg-primary-500 disabled:opacity-40"
                >
                  {loading ? 'Tekshirilmoqda...' : 'Admin paneliga kirish'}
                </button>
              </form>
            )}

            {/* Done */}
            {step === 'done' && (
              <div className="py-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-500/20">
                  <CheckCircle2 className="h-8 w-8 text-accent-400" aria-hidden />
                </div>
                <h2 className="text-base font-bold text-white">Muvaffaqiyatli kirdingiz!</h2>
                <p className="mt-1 text-sm text-white/40">Admin panelga o&apos;tilmoqda...</p>
                <div className="mt-4 flex justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-400/30 border-t-primary-400" />
                </div>
              </div>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-white/25">
            Admin emassiz?{' '}
            <Link href="/" className="inline-flex items-center gap-1 text-primary-400 transition-colors hover:text-primary-300">
              <ArrowLeft className="h-3 w-3" aria-hidden />
              Bosh sahifaga qaytish
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function AdminErrorBox({ msg }: { msg: string }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-400">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{msg}</span>
    </div>
  )
}
