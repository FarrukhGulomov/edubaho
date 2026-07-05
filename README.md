# EDUBAHO 🎓

O'zbekistondagi ta'lim muassasalarini (bog'chalar, maktablar, universitetlar,
o'quv markazlari) qidirish, solishtirish va baholash platformasi.

## Arxitektura

```
edubaho/
├── apps/api/          Fastify + Prisma + PostgreSQL + Redis   (Railway, Docker)
├── apps/web/          Next.js 15 App Router + Tailwind         (Railway, Docker)
└── packages/shared/   Umumiy TypeScript types/konstantalar
```

Barcha servislar (API, Web, Postgres, Redis) **bitta Railway project**ida,
har biri o'z `Dockerfile`i orqali build bo'ladi.

| Xizmat | Texnologiya | Prod hosting |
|---|---|---|
| API | Fastify 5, Prisma, Zod | Railway (Docker: `apps/api/Dockerfile`) |
| Frontend | Next.js 15, Tailwind | Railway (Docker: `apps/web/Dockerfile`) |
| Database | PostgreSQL 16 | Railway Postgres |
| Cache/OTP/Session | Redis | Railway Redis |
| Qidiruv (ixtiyoriy) | Meilisearch | Railway template |
| Fayl saqlash (ixtiyoriy) | Cloudflare R2 | Cloudflare |
| SMS OTP | Playmobile | — |
| Auth | SMS OTP + Telegram Login + Google OAuth + Telegram Mini App | — |

## Lokal ishga tushirish

```bash
# 1. Docker servislar (PostgreSQL + Redis + Meilisearch)
docker-compose up -d

# 2. Dependencies
npm install

# 3. Env fayllar
cp apps/api/.env.example apps/api/.env        # qiymatlarni to'ldiring
cp apps/web/.env.local.example apps/web/.env.local

# 4. Migratsiya + seed
cd apps/api && npx prisma migrate dev && npm run db:seed

# 5. Ishga tushirish (alohida terminallar)
cd apps/api && npm run dev     # http://localhost:3001
cd apps/web && npm run dev     # http://localhost:3000
```

Batafsil dev yo'riqnoma: [DEV.md](./DEV.md)

## Production deploy

To'liq qadam-baqadam qo'llanma: **[DEPLOY.md](./DEPLOY.md)**

Qisqacha:
1. Railway project → **+ New → Database**: Postgres + Redis
2. Railway'da GitHub repo'ni ikki marta servis sifatida qo'shing:
   - `api` — Root Directory **bo'sh**, Builder=Dockerfile, Path=`apps/api/Dockerfile`
   - `web` — Root Directory **bo'sh**, Builder=Dockerfile, Path=`apps/web/Dockerfile`
3. Env o'zgaruvchilarni `.env.example` fayllardagi ro'yxat bo'yicha kiriting
4. Birinchi super adminni `POST /api/v1/auth/setup-super-admin` bilan yarating

Migratsiya va seed alohida qadam talab qilmaydi — `apps/api/Dockerfile`ning
`CMD`i har safar konteyner ishga tushganda avtomatik bajaradi.

## Hujjatlar

| Fayl | Mavzu |
|---|---|
| [DEPLOY.md](./DEPLOY.md) | Production deploy (Docker + Railway) |
| [DEV.md](./DEV.md) | Lokal development, OTP olish, admin kirish |
| [docs/TAHLIL.md](./docs/TAHLIL.md) | Mahsulot/UX/xavfsizlik tahlili |
| [docs/ALGORITM.md](./docs/ALGORITM.md) | EduFit tavsiya algoritmi |
