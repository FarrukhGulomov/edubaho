import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Vite avtomatik ravishda loyihadagi `.env`/`.env.local` fayllarini
  // process.env'ga yuklaydi — bu esa xato bilan haqiqiy dev DB'ga
  // (apps/api/.env) ulanib ketish xavfini tug'diradi. O'chirib
  // qo'yamiz — env FAQAT `.env.test`dan (loadTestEnv orqali) keladi.
  envDir: false,
  test: {
    environment: 'node',
    globalSetup: ['./src/test/globalSetup.ts'],
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 20_000,
    hookTimeout: 30_000,
    // Barcha test fayllari BITTA ulashilgan test DB/Redis/Fastify app'dan
    // foydalanadi (har bir test oldidan tozalanadi) — parallel yugurish
    // poyga holatiga olib keladi, shuning uchun bitta process'da ketma-ket
    // ishga tushiriladi.
    fileParallelism: false,
    pool: 'forks',
    isolate: false,
    include: ['src/**/*.test.ts'],
  },
})
