import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { Inter } from 'next/font/google'
import './globals.css'
import CompareBar from '@/components/compare/CompareBar'
import TelegramProvider from '@/components/shared/TelegramProvider'
import { LangProvider } from '@/contexts/LangContext'
import { CompareProvider } from '@/hooks/useCompare'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0369a1',
  // Telegram Mini App va iPhone notch: kontent xavfsiz zonagacha cho'zilsin
  viewportFit: 'cover',
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bilimon.uz'

export const metadata: Metadata = {
  // Nisbiy OG rasm yo'llari to'liq URL'ga aylanishi uchun shart
  // (busiz ijtimoiy tarmoq/qidiruv preview'i rasmsiz chiqadi)
  metadataBase: new URL(SITE_URL),
  title: {
    default: "BilimOn — O'zbekistondagi eng yaxshi ta'lim muassasalari",
    template: "%s | BilimOn",
  },
  description:
    "O'zbekistondagi maktablar, universitetlar, kurslar va bog'chalarni qidiring, solishtiring va baholang.",
  keywords: [
    "ta'lim",
    "maktab",
    'universitet',
    'kurs',
    "bog'cha",
    "O'zbekiston",
    'reyting',
    'sharh',
  ],
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: 'website',
    locale: 'uz_UZ',
    alternateLocale: 'ru_RU',
    siteName: 'BilimOn',
    url: SITE_URL,
    // Har bir sahifa o'zinikini bermasa, shu standart rasm ishlatiladi —
    // busiz ulashishda/qidiruvda hech qanday preview rasmi chiqmasdi
    images: [{ url: '/brand/bilimon-app-icon-512.png', width: 512, height: 512, alt: 'BilimOn' }],
  },
  twitter: {
    card: 'summary',
    images: ['/brand/bilimon-app-icon-512.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/brand/favicon-32.png',
    apple: '/brand/bilimon-app-icon-192.png',
  },
  // Google Search Console'da domenni tasdiqlashda beriladigan kod —
  // Railway/Vercel'da NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION o'rnatilmaguncha
  // sukut bo'yicha o'chiq (undefined bo'lsa Next.js bu meta tegni chiqarmaydi)
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="uz" className={inter.variable}>
      <body className="min-h-screen bg-gray-50">
        {/* Telegram Mini App SDK — TWA ichida window.Telegram.WebApp beradi.
            afterInteractive: faqat TelegramProvider useEffect'da (hydration'dan
            keyin) tekshiriladi, shuning uchun oldindan bloklash shart emas —
            beforeInteractive barcha (asosan Google'dan kelgan) tashrifchilar
            uchun keraksiz render-blocking bo'lardi (Core Web Vitals/INP) */}
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
        <LangProvider>
          <TelegramProvider>
            <CompareProvider>
              {children}
              <div className="no-print"><CompareBar /></div>
            </CompareProvider>
          </TelegramProvider>
        </LangProvider>
      </body>
    </html>
  )
}
