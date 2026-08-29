import fs from 'fs'
import path from 'path'

let loaded = false

/**
 * `.env.test`ni process.env'ga MAJBURIY (override) tarzda yuklaydi.
 *
 * `process.loadEnvFile` ataylab qo'llanilmadi — Vite/Vitest konfiguratsiyani
 * o'qishning o'zi (`vitest.config.ts` yuklanishidan OLDIN) loyihadagi
 * `apps/api/.env` (haqiqiy dev fayli!) ni process.env'ga avtomatik
 * yuklab qo'yishi mumkin, va `loadEnvFile`ning "mavjud qiymatni
 * bosib o'tmaslik" xatti-harakati shu sabab test DB o'rniga xato bilan
 * DEV DB'ga ulanib qolishga olib kelishi mumkin edi (tekshirib ko'rilgan
 * va aynan shu holat yuz berdi). Shuning uchun bu yerda `.env.test`dagi
 * har bir qiymat ANIQ va SO'ZSIZ ustun qo'yiladi.
 */
export function loadTestEnv(): void {
  if (loaded) return
  loaded = true
  process.env.NODE_ENV = 'test'

  const file = path.join(__dirname, '../../.env.test')
  if (!fs.existsSync(file)) return

  for (const rawLine of fs.readFileSync(file, 'utf-8').split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}
