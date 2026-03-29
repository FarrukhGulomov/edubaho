import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import CompareBar from '@/components/compare/CompareBar'
import { LangProvider } from '@/contexts/LangContext'

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="uz" className={inter.variable}>
      <body className="min-h-screen bg-gray-50">
        <LangProvider>
          {children}
          <CompareBar />
        </LangProvider>
      </body>
    </html>
  )
}
