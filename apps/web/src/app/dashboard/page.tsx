import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="mb-6 text-7xl">🏗️</div>
      <h1 className="mb-3 text-2xl font-black text-gray-900">Dashboard tez orada!</h1>
      <p className="mb-8 max-w-sm text-gray-500 leading-relaxed">
        Muassasa egasi paneliga kirish uchun tasdiqlanish kerak.
        Biz siz bilan bog&apos;lanamiz.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <a
          href="https://t.me/edureyting"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-2xl bg-sky-500 py-4 font-bold text-white hover:bg-sky-600 transition-colors"
        >
          ✈️ Telegram orqali murojaat
        </a>
        <Link
          href="/"
          className="rounded-2xl border border-gray-300 py-4 font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
        >
          Bosh sahifaga qaytish
        </Link>
      </div>
    </div>
  )
}
