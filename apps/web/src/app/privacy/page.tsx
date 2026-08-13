import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'

export const metadata: Metadata = {
  title: 'Maxfiylik siyosati',
  description: "BilimOn shaxsiy ma'lumotlarni qayta ishlash siyosati.",
}

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <div className="mb-8">
          <Link href="/" className="text-sm text-primary-600 hover:underline">
            ← Bosh sahifaga qaytish
          </Link>
          <h1 className="mt-4 text-3xl font-black text-gray-900">Maxfiylik siyosati</h1>
          <p className="mt-2 text-sm text-gray-500">Oxirgi yangilanish: 2026-yil 13-avgust</p>
        </div>

        <div className="space-y-8 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">

          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">1. Umumiy qoidalar</h2>
            <p className="text-gray-600 leading-relaxed">
              Ushbu Maxfiylik siyosati BilimOn platformasi (&quot;biz&quot;) foydalanuvchilarning
              (&quot;siz&quot;) shaxsiy ma&apos;lumotlarini qanday yig&apos;ishi, ishlatishi, saqlashi
              va uchinchi shaxslarga uzatishini tushuntiradi. Biz O&apos;zbekiston Respublikasining
              &quot;Shaxsga doir ma&apos;lumotlar to&apos;g&apos;risida&quot;gi Qonuniga muvofiq ish
              yuritamiz. Platformadan foydalanish orqali siz ushbu siyosatga rozilik bildirasiz.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">2. Qanday ma&apos;lumotlar yig&apos;iladi</h2>
            <p className="text-gray-600 leading-relaxed">Biz quyidagi ma&apos;lumotlarni yig&apos;amiz:</p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-gray-600 leading-relaxed">
              <li><strong>Ro&apos;yxatdan o&apos;tishda:</strong> ism, telefon raqami (Telegram orqali tasdiqlangan yoki qo&apos;lda kiritilgan), email va profil rasmi (Google orqali kirganda), Telegram/Google identifikatori</li>
              <li><strong>&quot;Menga mosini top&quot; anketasida:</strong> maqsadingiz (yo&apos;nalish), o&apos;qish formati, shahar, byudjet, o&apos;quv vaqti, til, yosh</li>
              <li><strong>Platformada faoliyat:</strong> qidiruvlar, ko&apos;rilgan/saqlangan muassasalar, yozilgan sharhlar, qo&apos;ng&apos;iroq/aloqa tugmalari bosilishi</li>
              <li><strong>Texnik ma&apos;lumotlar:</strong> IP-manzil (firibgarlikning oldini olish uchun), qurilma va brauzer turi, sessiya cookie&apos;lari</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">3. Ma&apos;lumotlar nima uchun ishlatiladi</h2>
            <ul className="list-disc space-y-1.5 pl-5 text-gray-600 leading-relaxed">
              <li>Sizga eng mos ta&apos;lim muassasalarini tavsiya qilish</li>
              <li>Siz tanlagan yoki qiziqish bildirgan muassasa bilan bog&apos;lanishingizga ko&apos;maklashish</li>
              <li>Hisobingizni boshqarish, referral dasturi va mukofotlarni hisoblash</li>
              <li>Firibgarlik va suiste&apos;molni aniqlash hamda oldini olish</li>
              <li>Platforma sifatini yaxshilash (anonim statistika)</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">4. Ma&apos;lumotlar kim bilan bo&apos;lishiladi</h2>
            <p className="text-gray-600 leading-relaxed">
              <strong>Ta&apos;lim muassasalari bilan:</strong> agar siz &quot;Menga mosini top&quot;
              anketasini to&apos;ldirsangiz, muassasa sahifasiga tashrif buyursangiz yoki
              &quot;Bog&apos;lanish&quot; tugmasini bossangiz — ismingiz, telefon raqamingiz va
              bildirgan qiziqishingiz (yo&apos;nalish, byudjet, shahar) siz qiziqish bildirgan
              ta&apos;lim muassasasiga <strong>&quot;lid&quot; sifatida</strong> taqdim etilishi
              mumkin, ular siz bilan bog&apos;lanib, xizmatlarini taklif qilishi uchun. Bu — platforma
              xizmatining asosiy maqsadi.
            </p>
            <p className="mt-3 text-gray-600 leading-relaxed">
              <strong>Xizmat ko&apos;rsatuvchi hamkorlar bilan:</strong> Telegram (bot orqali telefon
              tasdiqlash), Google (kirish xizmati), SMS-provayder (agar yoqilgan bo&apos;lsa) — faqat
              texnik xizmatni ta&apos;minlash uchun zarur hajmda.
            </p>
            <p className="mt-3 text-gray-600 leading-relaxed">
              Biz ma&apos;lumotlaringizni reklama kompaniyalariga sotmaymiz va yuqorida
              ko&apos;rsatilmagan maqsadlarda uchinchi shaxslarga bermaymiz.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">5. Ma&apos;lumotlarni saqlash muddati</h2>
            <p className="text-gray-600 leading-relaxed">
              Ma&apos;lumotlaringiz hisobingiz faol bo&apos;lgan davrda saqlanadi. Hisobni
              o&apos;chirishni so&apos;raganingizda, qonun talab qiladigan hollar (masalan moliyaviy
              hisobotlar) bundan mustasno, ma&apos;lumotlaringiz o&apos;chiriladi yoki anonimlashtiriladi.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">6. Sizning huquqlaringiz</h2>
            <p className="text-gray-600 leading-relaxed">Siz quyidagi huquqlarga egasiz:</p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-gray-600 leading-relaxed">
              <li>O&apos;zingiz haqingizda qanday ma&apos;lumot saqlanayotganini bilish</li>
              <li>Noto&apos;g&apos;ri ma&apos;lumotni tuzatishni so&apos;rash (profil sahifasida)</li>
              <li>Hisobingizni va ma&apos;lumotlaringizni o&apos;chirishni so&apos;rash</li>
              <li>Ma&apos;lumot muassasalarga uzatilishiga roziligingizni istalgan vaqt qaytarib olish</li>
            </ul>
            <p className="mt-3 text-gray-600 leading-relaxed">
              Ushbu huquqlardan foydalanish uchun{' '}
              <a href="https://t.me/TrustboxInc" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                Telegram orqali
              </a>{' '}
              murojaat qiling.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">7. Xavfsizlik</h2>
            <p className="text-gray-600 leading-relaxed">
              Ma&apos;lumotlaringiz shifrlangan aloqa kanali (HTTPS) orqali uzatiladi, kirish
              huquqlari cheklangan va barcha admin harakatlari audit jurnalida qayd etiladi.
              Shunga qaramay, internet orqali uzatishning mutlaqo xavfsiz usuli yo&apos;qligini
              tushunishingizni so&apos;raymiz.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">8. Cookie va analytics</h2>
            <p className="text-gray-600 leading-relaxed">
              Sayt ishlashini yaxshilash uchun cookie va analytics ma&apos;lumotlaridan foydalanamiz.
              Sessiya identifikatori orqali anonim statistika to&apos;planadi.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">9. Bog&apos;lanish</h2>
            <p className="text-gray-600 leading-relaxed">
              Maxfiylik siyosati bo&apos;yicha savollar uchun{' '}
              <a href="https://t.me/TrustboxInc" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                Telegram orqali
              </a>{' '}
              murojaat qiling. Shuningdek{' '}
              <Link href="/terms" className="text-primary-600 hover:underline">
                Foydalanish shartlari
              </Link>{' '}
              bilan tanishing.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  )
}
