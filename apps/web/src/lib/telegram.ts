/**
 * Telegram Mini App (Web App) SDK yordamchilari
 *
 * Sayt Telegram ichida ochilganda window.Telegram.WebApp mavjud bo'ladi.
 * Skript layout'da beforeInteractive strategiyasi bilan yuklanadi.
 * https://core.telegram.org/bots/webapps
 */

interface TelegramBackButton {
  isVisible: boolean
  show: () => void
  hide: () => void
  onClick: (cb: () => void) => void
  offClick: (cb: () => void) => void
}

interface TelegramHaptic {
  impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
  notificationOccurred: (type: 'error' | 'success' | 'warning') => void
  selectionChanged: () => void
}

interface TelegramWebApp {
  initData: string
  initDataUnsafe: {
    user?: { id: number; first_name: string; last_name?: string; username?: string; photo_url?: string }
    start_param?: string
  }
  version: string
  platform: string
  colorScheme: 'light' | 'dark'
  isExpanded: boolean
  ready: () => void
  expand: () => void
  close: () => void
  setHeaderColor: (color: string) => void
  setBackgroundColor: (color: string) => void
  enableClosingConfirmation: () => void
  disableVerticalSwipes?: () => void
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void
  openTelegramLink: (url: string) => void
  BackButton: TelegramBackButton
  HapticFeedback: TelegramHaptic
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp }
  }
}

/** Telegram Mini App ichida ishlayapmizmi? */
export function isTelegramWebApp(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean(window.Telegram?.WebApp?.initData)
}

/** WebApp obyektini olish (TWA'dan tashqarida null) */
export function getTWA(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null
  const twa = window.Telegram?.WebApp
  return twa?.initData ? twa : null
}

/** Mini App'ni ishga tayyorlash: ready + expand + brend rangi */
export function initTelegramWebApp(): void {
  const twa = getTWA()
  if (!twa) return
  twa.ready()
  twa.expand()
  try {
    twa.setHeaderColor('#0369a1')
    // Wizard/scroll sahifalarda tasodifiy yopilib ketmasin
    twa.disableVerticalSwipes?.()
  } catch { /* eski Telegram versiyalarida ba'zi metodlar yo'q */ }
}

/** Haptic feedback — tugma bosilganda yengil titrash */
export function haptic(style: 'light' | 'medium' | 'success' = 'light'): void {
  const twa = getTWA()
  if (!twa) return
  try {
    if (style === 'success') twa.HapticFeedback.notificationOccurred('success')
    else twa.HapticFeedback.impactOccurred(style)
  } catch { /* ixtiyoriy */ }
}

/** Tashqi havolani ochish — TWA ichida openLink, oddiy brauzerda yangi tab */
export function openExternalLink(url: string): void {
  const twa = getTWA()
  if (twa) {
    // Telegram havolalari native ochiladi (masalan support kanali)
    if (url.startsWith('https://t.me/')) twa.openTelegramLink(url)
    else twa.openLink(url)
  } else {
    window.open(url, '_blank', 'noopener')
  }
}
