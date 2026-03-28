'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
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

  // Allaqachon kirgan adminni /admin ga yo'naltirish
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
        setStep('pin')
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Telegram orqali kirish muvaffaqiyatsiz')
        setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // PIN inputga focus
  useEffect(() => {
    if (step === 'pin') pinRef.current?.focus()
  }, [step])

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
              {(['auth', 'pin'] as const).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    step === s ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/40'
                    : (step === 'pin' && i === 0) || step === 'done'
                      ? 'bg-green-500 text-white'
                      : 'bg-white/10 text-white/40'
                  }`}>
                    {((step === 'pin' && i === 0) || step === 'done') ? '✓' : i + 1}
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

                <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-xs text-blue-300 text-center">
                  ℹ️ Faqat admin huquqidagi Telegram akkauntlar kira oladi
                </div>
              </div>
            )}

            {/* ── Step 2: Admin PIN ── */}
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
