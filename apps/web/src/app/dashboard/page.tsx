import Link from 'next/link'
import type { Metadata } from 'next'
import { Construction, Send } from 'lucide-react'

export const metadata: Metadata = { title: 'Dashboard' }

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100">
        <Construction className="h-10 w-10 text-gray-300" strokeWidth={1.5} />
      </div>
      <h1 className="mb-3 text-2xl font-bold text-gray-900">Dashboard tez orada!</h1>
      <p className="mb-8 max-w-sm leading-relaxed text-gray-500">
        Muassasa egasi paneliga kirish uchun tasdiqlanish kerak.
        Biz siz bilan bog&apos;lanamiz.
      </p>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <a
          href="https://t.me/edureyting"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl bg-sky-500 py-4 font-semibold text-white transition-colors hover:bg-sky-600"
        >
          <Send className="h-4 w-4 shrink-0" strokeWidth={1.75} /> Telegram orqali murojaat
        </a>
        <Link
          href="/"
          className="rounded-xl border border-gray-300 py-4 font-semibold text-gray-700 transition-colors hover:bg-gray-100"
        >
          Bosh sahifaga qaytish
        </Link>
      </div>
    </div>
  )
}
