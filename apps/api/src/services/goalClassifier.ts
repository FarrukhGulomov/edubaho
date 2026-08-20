import { EDUCATION_CATEGORIES, classifyGoalCategory } from '../utils/educationCategories'
import { getLlmClient } from './llm'

/**
 * Kalit-so'z tizimi (classifyGoalCategory) hech qanday toifani
 * topolmagan holatda ishga tushadigan AI fallback.
 *
 * Nega faqat fallback: kalit-so'z tizimi bepul va bir zumda ishlaydi,
 * aksariyat aniq so'rovlarni (IELTS, Dasturlash va h.k.) allaqachon
 * to'g'ri aniqlaydi. AI faqat foydalanuvchi tabiiy, oldindan
 * bashorat qilinmagan iboralar bilan yozganda (masalan "hunar
 * o'rganish", "til o'rganish") kerak bo'ladi — shuning uchun bitta
 * qidiruv so'rovida ko'pi bilan BIR marta chaqiriladi (nomzodlar
 * sonidan qat'i nazar — natija match.ts'da barcha nomzodlarga qayta
 * ishlatiladi, har biriga alohida AI so'rovi YUBORILMAYDI).
 *
 * OPENROUTER_API_KEY sozlanmagan bo'lsa — jim `null` qaytaradi,
 * qidiruv AI'siz (faqat kalit-so'z natijasi bilan) davom etadi.
 */
export async function classifyGoalWithAI(goal: string): Promise<string | null> {
  const client = getLlmClient()
  if (!client) return null

  const options = EDUCATION_CATEGORIES
    .map((c) => `${c.code}: ${c.labelUz} (${c.labelRu})`)
    .join('\n')

  const prompt =
    `Ta'lim platformasi foydalanuvchisi qidiruv maqsadini yozdi: "${goal}"\n\n` +
    "Quyidagi toifalardan foydalanuvchi niyatiga ENG mos kelganini tanlang.\n" +
    "Faqat kod nomini qaytaring (masalan: IELTS), boshqa hech qanday matn yozmang.\n" +
    "Hech biri mos kelmasa: NONE\n\n" +
    `${options}`

  try {
    const raw = await client.complete({ prompt, maxTokens: 20, temperature: 0 })
    const code = raw.trim().toUpperCase().replace(/[^A-Z_]/g, '')
    if (!code || code === 'NONE') return null
    const isValid = EDUCATION_CATEGORIES.some((c) => c.code === code)
    return isValid ? code : null
  } catch (err) {
    // AI xatosi qidiruvni to'xtatmasligi kerak — faqat AI yordamisiz davom etadi
    console.error('AI goal klassifikatsiyasi xatosi:', err)
    return null
  }
}

/**
 * `goal` matnidan toifani BIR MARTA (so'rov boshida) aniqlaydi — avval
 * tezkor/bepul kalit-so'z tizimi (classifyGoalCategory), faqat u hech
 * narsa topa olmasa AI fallback (classifyGoalWithAI). Natija route
 * darajasida keshlanib, barcha nomzodlarga qayta ishlatiladi — shu
 * sababli bitta so'rovda AI ko'pi bilan bir marta chaqiriladi.
 */
export async function resolveGoalCategory(goal: string): Promise<string | null> {
  const trimmed = goal.trim()
  if (!trimmed) return null

  const keywordMatch = classifyGoalCategory(trimmed)
  if (keywordMatch) return keywordMatch

  return classifyGoalWithAI(trimmed)
}
