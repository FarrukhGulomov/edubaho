'use client'

/**
 * GuestLeadWidget — avtorizatsiyadan o'tmagan yuqori-intentsiyali mehmonlar uchun
 * kontakt ma'lumoti to'plovchi sticky widget.
 *
 * Ko'rinish sharti:
 *  - Foydalanuvchi autentifikatsiyadan o'tmagan
 *  - 2 yoki undan ko'p muassasa sahifasi ko'rilgan (localStorage hisoblagich)
 *
 * Maqsad: telefon yoki email orqali anonim mehmonni lida aylantirish.
 */

import { useState, useEffect } from 'react'
import { MessageCircle, X, Smartphone, Mail, CheckCircle2 } from 'lucide-react'
import { track } from '@/lib/analytics'
import { useLang, t } from '@/contexts/LangContext'

const VISIT_KEY = 'edu_inst_visits'
const SHOWN_KEY = 'edu_lead_widget_shown'
const THRESHOLD = 2

function incrementVisit() {
  try {
    const n = parseInt(localStorage.getItem(VISIT_KEY) ?? '0', 10) + 1
    localStorage.setItem(VISIT_KEY, String(n))
    return n
  } catch { return 0 }
}

function isAlreadyShown() {
  try { return localStorage.getItem(SHOWN_KEY) === '1' } catch { return false }
}

function markShown() {
  try { localStorage.setItem(SHOWN_KEY, '1') } catch { /* noop */ }
}

interface Props {
  triggerOnMount?: boolean
}

export default function GuestLeadWidget({ triggerOnMount = true }: Props) {
  const { lang } = useLang()
  const [visible, setVisible]     = useState(false)
  const [expanded, setExpanded]   = useState(false)
  const [mode, setMode]           = useState<'phone' | 'email'>('phone')
  const [phone, setPhone]         = useState('+998 ')
  const [email, setEmail]         = useState('')
  const [sent, setSent]           = useState(false)
  const [loading, setLoading]     = useState(false)

  useEffect(() => {
    const token = (() => { try { return localStorage.getItem('accessToken') } catch { return null } })()
    if (token) return
    if (isAlreadyShown()) return

    const count = triggerOnMount ? incrementVisit() : parseInt(localStorage.getItem(VISIT_KEY) ?? '0', 10)
    if (count >= THRESHOLD) {
      const timer = setTimeout(() => setVisible(true), 2000)
      return () => clearTimeout(timer)
    }
  }, [triggerOnMount])

  function handleClose() {
    setVisible(false)
    markShown()
    track('contact_click', {
      category: 'engagement',
      properties: { contactType: 'lead_widget_dismissed' },
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mode === 'phone') {
      const cleaned = phone.replace(/\s/g, '')
      if (cleaned.replace(/\D/g, '').length < 12) return
      track('contact_click', {
        category: 'engagement',
        properties: { contactType: 'lead_capture', phone: cleaned },
      })
    } else {
      if (!email.includes('@')) return
      track('contact_click', {
        category: 'engagement',
        properties: { contactType: 'lead_capture_email', email },
      })
    }
    setLoading(true)
    await new Promise(r => setTimeout(r, 400))
    setLoading(false)
    setSent(true)
    markShown()
    setTimeout(() => setVisible(false), 3000)
  }

  const phoneValid = phone.replace(/\D/g, '').length >= 12
  const emailValid = email.includes('@') && email.includes('.')
  const canSubmit  = mode === 'phone' ? phoneValid : emailValid

  if (!visible) return null

  const ui = {
    bar:        { uz: "Bepul maslahat oling — kontaktingizni qoldiring!", ru: 'Бесплатная консультация — оставьте контакт!' },
    title:      { uz: 'Qaysi muassasa siz uchun mos?', ru: 'Какое учреждение вам подойдёт?' },
    subtitle:   { uz: "Mutaxassisimiz 24 soat ichida aloqaga chiqadi", ru: 'Наш специалист свяжется с вами в течение 24 часов' },
    phoneLabel: { uz: 'Telefon raqam', ru: 'Номер телефона' },
    emailLabel: { uz: 'Email pochta', ru: 'Электронная почта' },
    btn:        { uz: 'Maslahat olish', ru: 'Получить консультацию' },
    sending:    { uz: 'Yuborilmoqda...', ru: 'Отправляется...' },
    done:       { uz: "Rahmat! Tez orada bog'lanamiz.", ru: 'Спасибо! Скоро свяжемся с вами.' },
    orEmail:    { uz: 'yoki email bilan', ru: 'или через email' },
    orPhone:    { uz: 'yoki telefon bilan', ru: 'или по телефону' },
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
      {!expanded ? (
        /* ── Compact bar ── */
        <div className="flex items-center justify-between gap-3 border-t border-amber-200 bg-amber-50 px-4 py-3 shadow-lg">
          <div className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold text-amber-800">
            <MessageCircle className="h-5 w-5 shrink-0" strokeWidth={1.75} />
            <span className="hidden truncate sm:inline">{t(lang, ui.bar)}</span>
            <span className="truncate sm:hidden">{t(lang, { uz: 'Bepul maslahat oling!', ru: 'Бесплатная консультация!' })}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setExpanded(true)}
              className="whitespace-nowrap rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
            >
              {t(lang, { uz: "Xabar qoldirish", ru: 'Оставить контакт' })}
            </button>
            <button onClick={handleClose} className="shrink-0 p-1 text-amber-400 hover:text-amber-600" aria-label="Yopish">
              <X className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      ) : (
        /* ── Expanded form ── */
        <div className="border-t border-gray-200 bg-white px-4 py-5 shadow-2xl">
          <div className="mx-auto max-w-sm">
            {sent ? (
              <p className="flex items-center justify-center gap-2 py-2 text-center text-base font-semibold text-emerald-700">
                <CheckCircle2 className="h-5 w-5 shrink-0" strokeWidth={1.75} /> {t(lang, ui.done)}
              </p>
            ) : (
              <>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900">{t(lang, ui.title)}</h3>
                    <p className="mt-0.5 text-xs text-gray-500">{t(lang, ui.subtitle)}</p>
                  </div>
                  <button onClick={handleClose} className="shrink-0 p-1 text-gray-400 hover:text-gray-600">
                    <X className="h-5 w-5" strokeWidth={1.75} />
                  </button>
                </div>

                {/* Telefon / Email toggle */}
                <div className="mb-3 flex rounded-xl border border-gray-200 bg-gray-50 p-1">
                  <button
                    type="button"
                    onClick={() => setMode('phone')}
                    className={`flex flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                      mode === 'phone' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <Smartphone className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} /> {t(lang, { uz: 'Telefon', ru: 'Телефон' })}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('email')}
                    className={`flex flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                      mode === 'email' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <Mail className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} /> Email
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="flex gap-2">
                  <div className="flex-1">
                    {mode === 'phone' ? (
                      <>
                        <label className="mb-1 block text-xs font-semibold text-gray-600">
                          {t(lang, ui.phoneLabel)}
                        </label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={e => {
                            const val = e.target.value
                            if (!val.startsWith('+998')) { setPhone('+998 '); return }
                            setPhone(val)
                          }}
                          placeholder="+998 90 123 45 67"
                          className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                        />
                      </>
                    ) : (
                      <>
                        <label className="mb-1 block text-xs font-semibold text-gray-600">
                          {t(lang, ui.emailLabel)}
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="example@gmail.com"
                          className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        />
                      </>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !canSubmit}
                    className={`self-end whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-colors ${
                      mode === 'phone'
                        ? 'bg-amber-500 hover:bg-amber-600'
                        : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                  >
                    {loading ? t(lang, ui.sending) : t(lang, ui.btn)}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
