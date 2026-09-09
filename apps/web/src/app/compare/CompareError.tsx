'use client'

import { WifiOff } from 'lucide-react'
import { useLang, t } from '@/contexts/LangContext'

/**
 * Solishtirish ma'lumotlarini yuklab bo'lmagan holat (server bilan
 * bog'lanish xatosi) — avval bu holatda ham CompareEmpty, ham notFound()
 * chaqirilardi, ya'ni "hech narsa tanlanmagan"/"bunday solishtirish
 * mavjud emas" bilan bir xil ko'rinardi, holbuki foydalanuvchi to'g'ri
 * havola bilan kelgan va sabab vaqtinchalik server xatosi edi
 * (UX audit topilmasi).
 */
export default function CompareError() {
  const { lang } = useLang()

  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center sm:py-24">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
        <WifiOff className="h-7 w-7 text-red-300" strokeWidth={1.5} />
      </div>
      <h1 className="mb-2.5 text-2xl font-bold text-gray-900 sm:text-3xl">
        {t(lang, { uz: "Solishtirish ma'lumotlarini yuklab bo'lmadi", ru: 'Не удалось загрузить данные для сравнения' })}
      </h1>
      <p className="mb-8 text-[15px] leading-relaxed text-gray-500">
        {t(lang, {
          uz: "Server bilan bog'lanishda xatolik yuz berdi. Birozdan keyin qayta urinib ko'ring.",
          ru: 'Ошибка соединения с сервером. Повторите попытку через некоторое время.',
        })}
      </p>
      <button
        onClick={() => window.location.reload()}
        className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-8 py-3.5 font-bold text-white shadow-sm transition-colors hover:bg-primary-700"
      >
        {t(lang, { uz: 'Qayta urinish', ru: 'Повторить' })}
      </button>
    </main>
  )
}
