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

# Barcha workspace dependencylarni o'rnatish
RUN npm install --frozen-lockfile

# Manba kodlarni ko'chirish
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Prisma client generate qilish
RUN cd apps/api && npx prisma generate

# TypeScript build
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

# Faqat production deps o'rnatish
RUN npm install --frozen-lockfile --omit=dev

# Prisma schema va migrations
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

# Prisma client (generated)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Build chiqishi
COPY --from=builder /app/apps/api/dist ./apps/api/dist

WORKDIR /app/apps/api

EXPOSE 3001

# Migrationlarni node orqali to'g'ridan-to'g'ri chaqiramiz (shell wrapper muammosini chetlab o'tamiz)
CMD ["sh", "-c", "node /app/node_modules/prisma/build/index.js migrate deploy && node dist/server.js"]
