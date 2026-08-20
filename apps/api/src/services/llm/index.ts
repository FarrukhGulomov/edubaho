import type { LlmClient } from './types'
import { createOpenRouterClient } from './openrouter'
import { env } from '../../utils/env'

export type { LlmClient }

let cachedClient: LlmClient | null = null

/**
 * Faol LLM klientini qaytaradi (hozircha OpenRouter). Kalit sozlanmagan
 * bo'lsa `null` — chaqiruvchi kod (goalClassifier.ts) buni "AI o'chiq,
 * faqat kalit-so'z tizimi ishlaydi" deb talqin qiladi, xato tashlamaydi.
 *
 * Kelajakda boshqa provayderni to'g'ridan-to'g'ri qo'shish uchun:
 * shu faylga `createAnthropicClient`/`createGeminiClient` kabi yangi
 * factory import qilib, quyidagi shart zanjiriga qo'shish kifoya —
 * qolgan barcha kod (goalClassifier.ts va undan yuqorisi) o'zgarishsiz
 * qoladi, chunki ular faqat `LlmClient` interfeysi bilan ishlaydi.
 */
export function getLlmClient(): LlmClient | null {
  if (!env.OPENROUTER_API_KEY) return null
  if (!cachedClient) {
    cachedClient = createOpenRouterClient(env.OPENROUTER_API_KEY, env.OPENROUTER_MODEL)
  }
  return cachedClient
}
