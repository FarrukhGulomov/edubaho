import type { LlmClient } from './types'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

/**
 * OpenRouter — OpenAI-mos ("/chat/completions") API orqali ko'plab
 * provayder modellariga (Gemini, Claude, GPT va h.k.) bitta kalit bilan
 * kirish imkonini beradi. https://openrouter.ai/docs
 */
export function createOpenRouterClient(apiKey: string, model: string): LlmClient {
  return {
    async complete({ system, prompt, maxTokens = 50, temperature = 0 }) {
      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          // OpenRouter tavsiyasi — o'z ilovangizni identifikatsiya qilish
          // uchun (statistika/reyting sahifalarida ko'rinadi, ixtiyoriy)
          'HTTP-Referer': 'https://bilimon.uz',
          'X-Title': 'BilimOn',
        },
        body: JSON.stringify({
          model,
          messages: [
            ...(system ? [{ role: 'system', content: system }] : []),
            { role: 'user', content: prompt },
          ],
          max_tokens: maxTokens,
          temperature,
        }),
      })

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`OpenRouter xatosi (${res.status}): ${body.slice(0, 200)}`)
      }

      const data = await res.json() as {
        choices?: { message?: { content?: string } }[]
      }
      return data.choices?.[0]?.message?.content?.trim() ?? ''
    },
  }
}
