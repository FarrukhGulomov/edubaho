import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: "Foydalanish shartlari",
  description: "EDUBAHO.uz foydalanish shartlari va maxfiylik siyosati.",
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-sm text-primary-600 hover:underline">
            ← Bosh sahifaga qaytish
          </Link>
          <h1 className="mt-4 text-3xl font-black text-gray-900">Foydalanish shartlari</h1>
          <p className="mt-2 text-sm text-gray-500">Oxirgi yangilanish: 2026-yil 1-yanvar</p>
        </div>

        <div className="space-y-8 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">

          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">1. Umumiy qoidalar</h2>
            <p className="text-gray-600 leading-relaxed">
              EDUBAHO.uz — O&apos;zbekistondagi ta&apos;lim muassasalarini qidirish, solishtirish va baholash
              platformasi. Saytdan foydalanish orqali siz ushbu shartlarga rozilik bildirasiz.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">2. Foydalanuvchi ma&apos;lumotlari</h2>
            <p className="text-gray-600 leading-relaxed">
              Ro&apos;yxatdan o&apos;tish uchun faqat telefon raqamingiz so&apos;raladi. Biz sizning shaxsiy
              ma&apos;lumotlaringizni uchinchi shaxslarga bermayiz. Ma&apos;lumotlar faqat platformani
              yaxshilash maqsadida ishlatiladi.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">3. Sharhlar va baholash</h2>
            <p className="text-gray-600 leading-relaxed">
              Platforma foydalanuvchilari ta&apos;lim muassasalari haqida sharh yozish huquqiga ega.
              Sharhlar moderatsiya qilinadi. Yolg&apos;on yoki haqoratli sharhlar o&apos;chirilishi mumkin.
              Har bir foydalanuvchi bir muassasaga faqat bitta sharh qoldira oladi.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">4. Cookie va analytics</h2>
            <p className="text-gray-600 leading-relaxed">
              Sayt ishlashini yaxshilash uchun cookie va analytics ma&apos;lumotlaridan foydalanamiz.
              Sessiya identifikatori orqali anonim statistika to&apos;planadi. Shaxsiy ma&apos;lumotlar
              ruxsatisiz ishlatilmaydi.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">5. Muassasalar ma&apos;lumotlari</h2>
            <p className="text-gray-600 leading-relaxed">
              Platformadagi muassasalar haqidagi ma&apos;lumotlar ochiq manbalar va muassasa
              vakillari tomonidan taqdim etiladi. EDUBAHO.uz ma&apos;lumotlarning to&apos;liqligi
              uchun javobgar emas.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">6. Bog&apos;lanish</h2>
            <p className="text-gray-600 leading-relaxed">
              Savollar va takliflar uchun{' '}
              <a
                href="https://t.me/edureyting"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline"
              >
                Telegram orqali
              </a>{' '}
              murojaat qiling.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
