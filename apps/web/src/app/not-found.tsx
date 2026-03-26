import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="mb-6 text-8xl">🎓</div>
      <h1 className="mb-3 text-3xl font-black text-gray-900">Sahifa topilmadi</h1>
      <p className="mb-8 text-gray-500 max-w-sm leading-relaxed">
        Siz qidirayotgan sahifa mavjud emas yoki o&apos;chirib yuborilgan
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          href="/"
          className="rounded-2xl bg-primary-600 py-4 font-bold text-white hover:bg-primary-700 transition-colors"
        >
          Bosh sahifaga qaytish
        </Link>
        <Link
          href="/search"
          className="rounded-2xl border border-gray-300 py-4 font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
        >
          Muassasalarni qidirish
        </Link>
      </div>
    </div>
  )
}
