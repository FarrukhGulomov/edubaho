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
import { MessageCircle, Phone, Mail, X, CheckCircle2 } from 'lucide-react'
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
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
      {!expanded ? (
        /* ── Compact bar ── */
        <div className="glass flex items-center justify-between gap-3 border-t border-line px-4 py-3 shadow-pop">
          <div className="flex items-center gap-2.5 text-sm font-medium text-ink">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400">
              <MessageCircle className="h-4 w-4" aria-hidden />
            </span>
            <span className="hidden sm:inline">{t(lang, ui.bar)}</span>
            <span className="sm:hidden">{t(lang, { uz: 'Bepul maslahat oling!', ru: 'Бесплатная консультация!' })}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={() => setExpanded(true)}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
            >
              {t(lang, { uz: 'Xabar qoldirish', ru: 'Оставить контакт' })}
            </button>
            <button
              onClick={handleClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-ink"
              aria-label="Yopish"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      ) : (
        /* ── Expanded form ── */
        <div className="border-t border-line bg-surface px-4 py-5 shadow-pop">
          <div className="mx-auto max-w-sm">
            {sent ? (
              <p className="flex items-center justify-center gap-2 py-2 text-center text-base font-medium text-accent-700 dark:text-accent-300">
                <CheckCircle2 className="h-5 w-5" aria-hidden />
                {t(lang, ui.done)}
              </p>
            ) : (
              <>
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-ink">{t(lang, ui.title)}</h3>
                    <p className="mt-0.5 text-xs text-mute">{t(lang, ui.subtitle)}</p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-ink"
                    aria-label="Yopish"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>

                {/* Telefon / Email toggle */}
                <div className="mb-3 flex rounded-lg border border-line bg-surface-2 p-1">
                  {([
                    { key: 'phone' as const, icon: Phone, label: { uz: 'Telefon', ru: 'Телефон' } },
                    { key: 'email' as const, icon: Mail,  label: { uz: 'Email',   ru: 'Email' } },
                  ]).map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setMode(opt.key)}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-all ${
                        mode === opt.key
                          ? 'bg-surface text-ink shadow-card'
                          : 'text-faint hover:text-mute'
                      }`}
                      style={{ minHeight: 32 }}
                      aria-pressed={mode === opt.key}
                    >
                      <opt.icon className="h-3.5 w-3.5" aria-hidden />
                      {t(lang, opt.label)}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSubmit} className="flex gap-2">
                  <div className="flex-1">
                    {mode === 'phone' ? (
                      <>
                        <label htmlFor="lead-phone" className="mb-1 block text-xs font-medium text-mute">
                          {t(lang, ui.phoneLabel)}
                        </label>
                        <input
                          id="lead-phone"
                          type="tel"
                          value={phone}
                          onChange={e => {
                            const val = e.target.value
                            if (!val.startsWith('+998')) { setPhone('+998 '); return }
                            setPhone(val)
                          }}
                          placeholder="+998 90 123 45 67"
                          className="w-full rounded-lg border border-line-2 bg-surface px-3 py-2.5 text-sm text-ink outline-none transition-all placeholder:text-faint focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        />
                      </>
                    ) : (
                      <>
                        <label htmlFor="lead-email" className="mb-1 block text-xs font-medium text-mute">
                          {t(lang, ui.emailLabel)}
                        </label>
                        <input
                          id="lead-email"
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="example@gmail.com"
                          className="w-full rounded-lg border border-line-2 bg-surface px-3 py-2.5 text-sm text-ink outline-none transition-all placeholder:text-faint focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        />
                      </>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !canSubmit}
                    className="self-end rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
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
