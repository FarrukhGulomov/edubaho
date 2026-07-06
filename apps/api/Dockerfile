# ─────────────────────────────────────────────────
# Stage 1: Build
# ─────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Monorepo root package.json (workspaces uchun)
COPY package.json package-lock.json ./

# Workspace package.json fayllar
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Barcha workspace dependencylarni o'rnatish (package-lock.json'ga qat'iy mos)
RUN npm ci

# Manba kodlarni ko'chirish
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# "build" skripti prisma generate + tsc'ni birga bajaradi
RUN cd apps/api && npm run build

# ─────────────────────────────────────────────────
# Stage 2: Production image
# ─────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Prisma uchun OpenSSL kerak (Alpine da yo'q, qo'lda o'rnatamiz)
RUN apk add --no-cache openssl

# Production dependencylar uchun package.json
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Prisma schema'ni npm ci'dan OLDIN nusxalaymiz — @prisma/client'ning
# postinstall generate qadami schema topilmasa nomuvofiq holatga tushishi mumkin
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

# Faqat production deps o'rnatish (package-lock.json'ga qat'iy mos)
RUN npm ci --omit=dev

# Generate qilingan Prisma client (query engine) — builder'dan tayyor holda
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Build chiqishi
COPY --from=builder /app/apps/api/dist ./apps/api/dist

WORKDIR /app/apps/api

EXPOSE 3001

# Migratsiyalar avtomatik qo'llanadi, keyin server ishga tushadi.
# Seed faqat RUN_SEED=true env o'zgaruvchisi bilan ishlaydi (opt-in):
# Railway'da RUN_SEED=true qo'yib redeploy qilinadi, ma'lumot kirgach
# o'zgaruvchi o'chiriladi. Doimiy yoqiq qoldirish tavsiya etilmaydi —
# admin o'chirgan yozuvlarni upsert qayta tiklab qo'yishi mumkin.
CMD ["sh", "-c", "npx prisma migrate deploy && if [ \"$RUN_SEED\" = \"true\" ]; then node dist/seed.js; fi && node dist/server.js"]
