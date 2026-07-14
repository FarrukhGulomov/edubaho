import Link from 'next/link'
import { ArrowLeft, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 text-center">
      <div className="mb-5 text-5xl font-bold tracking-tight text-primary-100 dark:text-primary-900 select-none">
        404
      </div>
      <h1 className="mb-2 text-xl font-bold text-ink">Sahifa topilmadi</h1>
      <p className="mb-8 max-w-sm text-sm leading-relaxed text-mute">
        Siz qidirayotgan sahifa mavjud emas yoki o&apos;chirib yuborilgan
      </p>
      <div className="flex w-full max-w-xs flex-col gap-2.5">
        <Link href="/" className="btn-primary w-full">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Bosh sahifaga qaytish
        </Link>
        <Link href="/search" className="btn-secondary w-full">
          <Search className="h-4 w-4" aria-hidden />
          Muassasalarni qidirish
        </Link>
      </div>
    </div>
  )
}
