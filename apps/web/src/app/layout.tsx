import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import CompareBar from '@/components/compare/CompareBar'
import { LangProvider } from '@/contexts/LangContext'
import { ThemeProvider } from '@/contexts/ThemeContext'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0369a1' },
    { media: '(prefers-color-scheme: dark)', color: '#090d14' },
  ],
}

export const metadata: Metadata = {
  title: {
    default: "EDUBAHO.uz — O'zbekistondagi eng yaxshi ta'lim muassasalari",
    template: "%s | EDUBAHO.uz",
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
  openGraph: {
    type: 'website',
    locale: 'uz_UZ',
    alternateLocale: 'ru_RU',
    siteName: 'EDUBAHO.uz',
    url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://edureyting.uz',
  },
  robots: {
    index: true,
    follow: true,
  },
}

/** FOUC oldini olish: sahifa chizilishidan OLDIN saqlangan mavzuni qo'llash */
const themeInitScript = `
try {
  var t = localStorage.getItem('edu_theme');
  if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
} catch (e) {}
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="uz" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-canvas">
        <ThemeProvider>
          <LangProvider>
            {children}
            <CompareBar />
          </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
