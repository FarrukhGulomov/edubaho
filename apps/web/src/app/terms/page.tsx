import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: "Foydalanish shartlari",
  description: "EDUBAHO.uz foydalanish shartlari va maxfiylik siyosati.",
}

const sections = [
  {
    n: '1', title: 'Umumiy qoidalar',
    body: "EDUBAHO.uz — O'zbekistondagi ta'lim muassasalarini qidirish, solishtirish va baholash platformasi. Saytdan foydalanish orqali siz ushbu shartlarga rozilik bildirasiz.",
  },
  {
    n: '2', title: "Foydalanuvchi ma'lumotlari",
    body: "Ro'yxatdan o'tish uchun faqat telefon raqamingiz so'raladi. Biz sizning shaxsiy ma'lumotlaringizni uchinchi shaxslarga bermayiz. Ma'lumotlar faqat platformani yaxshilash maqsadida ishlatiladi.",
  },
  {
    n: '3', title: 'Sharhlar va baholash',
    body: "Platforma foydalanuvchilari ta'lim muassasalari haqida sharh yozish huquqiga ega. Sharhlar moderatsiya qilinadi. Yolg'on yoki haqoratli sharhlar o'chirilishi mumkin. Har bir foydalanuvchi bir muassasaga faqat bitta sharh qoldira oladi.",
  },
  {
    n: '4', title: 'Cookie va analytics',
    body: "Sayt ishlashini yaxshilash uchun cookie va analytics ma'lumotlaridan foydalanamiz. Sessiya identifikatori orqali anonim statistika to'planadi. Shaxsiy ma'lumotlar ruxsatisiz ishlatilmaydi.",
  },
  {
    n: '5', title: "Muassasalar ma'lumotlari",
    body: "Platformadagi muassasalar haqidagi ma'lumotlar ochiq manbalar va muassasa vakillari tomonidan taqdim etiladi. EDUBAHO.uz ma'lumotlarning to'liqligi uchun javobgar emas.",
  },
]

export default function TermsPage() {
  return (
    <div className="min-h-dvh bg-canvas px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-mute transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Bosh sahifaga qaytish
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-ink">Foydalanish shartlari</h1>
          <p className="mt-1 text-sm text-faint">Oxirgi yangilanish: 2026-yil 1-yanvar</p>
        </div>

        <div className="card p-8">
          <div className="space-y-8">
            {sections.map(s => (
              <section key={s.n}>
                <h2 className="mb-3 text-base font-semibold text-ink">
                  <span className="mr-2 tabular-nums text-faint">{s.n}.</span>
                  {s.title}
                </h2>
                <p className="text-sm leading-relaxed text-mute">{s.body}</p>
              </section>
            ))}

            <section>
              <h2 className="mb-3 text-base font-semibold text-ink">
                <span className="mr-2 tabular-nums text-faint">6.</span>
                Bog&apos;lanish
              </h2>
              <p className="text-sm leading-relaxed text-mute">
                Savollar va takliflar uchun{' '}
                <a
                  href="https://t.me/edureyting"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  Telegram orqali
                </a>{' '}
                murojaat qiling.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
