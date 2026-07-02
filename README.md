# EDUBAHO 🎓

O'zbekistondagi ta'lim muassasalarini (bog'chalar, maktablar, universitetlar,
o'quv markazlari) qidirish, solishtirish va baholash platformasi.

## Arxitektura

```
edubaho/
├── apps/api/          Fastify + Prisma + PostgreSQL + Redis  (Railway)
├── apps/web/          Next.js 15 App Router + Tailwind        (Vercel)
└── packages/shared/   Umumiy TypeScript types/konstantalar
```

| Xizmat | Texnologiya | Prod hosting |
|---|---|---|
| API | Fastify 5, Prisma, Zod | Railway |
| Frontend | Next.js 15, Tailwind | Vercel |
| Database | PostgreSQL 16 | Railway Postgres |
| Cache/OTP/Session | Redis | Railway Redis |
| Qidiruv (ixtiyoriy) | Meilisearch | Railway template |
| Fayl saqlash (ixtiyoriy) | Cloudflare R2 | Cloudflare |
| SMS OTP | Playmobile | — |
| Auth | SMS OTP + Telegram Login + Google OAuth | — |

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
1. **Railway**: Postgres + Redis + API servis (`apps/api` root directory)
2. **Vercel**: Web (`apps/web` root directory)
3. Env o'zgaruvchilarni `.env.example` fayllardagi ro'yxat bo'yicha kiriting
4. Birinchi super adminni `POST /api/v1/auth/setup-super-admin` bilan yarating

## Hujjatlar

| Fayl | Mavzu |
|---|---|
| [DEPLOY.md](./DEPLOY.md) | Production deploy (Railway + Vercel) |
| [DEV.md](./DEV.md) | Lokal development, OTP olish, admin kirish |
| [docs/TAHLIL.md](./docs/TAHLIL.md) | Mahsulot/UX/xavfsizlik tahlili |
| [docs/ALGORITM.md](./docs/ALGORITM.md) | EduFit tavsiya algoritmi |
