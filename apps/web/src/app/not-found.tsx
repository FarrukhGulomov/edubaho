import Link from 'next/link'
import { GraduationCap } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100">
        <GraduationCap className="h-10 w-10 text-gray-300" strokeWidth={1.5} />
      </div>
      <h1 className="mb-3 text-3xl font-bold text-gray-900">Sahifa topilmadi</h1>
      <p className="mb-8 max-w-sm leading-relaxed text-gray-500">
        Siz qidirayotgan sahifa mavjud emas yoki o&apos;chirib yuborilgan
      </p>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <Link
          href="/"
          className="rounded-xl bg-primary-600 py-4 font-semibold text-white transition-colors hover:bg-primary-700"
        >
          Bosh sahifaga qaytish
        </Link>
        <Link
          href="/search"
          className="rounded-xl border border-gray-300 py-4 font-semibold text-gray-700 transition-colors hover:bg-gray-100"
        >
          Muassasalarni qidirish
        </Link>
      </div>
    </div>
  )
}
