/**
 * Provayderdan mustaqil LLM klient interfeysi.
 *
 * Hozircha yagona implementatsiya — OpenRouter (openrouter.ts), lekin
 * chaqiruvchi kod (masalan goalClassifier.ts) faqat shu interfeys bilan
 * ishlaydi. Kelajakda Gemini/Claude/OpenAI'ni to'g'ridan-to'g'ri (yoki
 * boshqa provayder orqali) qo'shish uchun shu interfeysni amalga
 * oshiruvchi yangi fayl (masalan anthropic.ts) yetarli — index.ts'dagi
 * factory'da tanlov qo'shiladi, boshqa hech narsa o'zgarmaydi.
 */
export interface LlmClient {
  /**
   * Bitta oddiy so'rov-javob (single-turn) chaqiruvi. Suhbat tarixi,
   * streaming yoki tool-use qo'llab-quvvatlanmaydi — bu yerda faqat
   * qisqa, deterministik klassifikatsiya vazifalari uchun ishlatiladi.
   */
  complete(params: {
    system?: string
    prompt: string
    maxTokens?: number
    /** 0 — eng deterministik (klassifikatsiya uchun tavsiya etiladi) */
    temperature?: number
  }): Promise<string>
}
