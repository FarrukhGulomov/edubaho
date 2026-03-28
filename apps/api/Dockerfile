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

# Migrationlarni bajar (xato bo'lsa ham davom etamiz), keyin serverni ishga tushur
CMD ["sh", "-c", "npx prisma migrate deploy 2>&1 || echo 'Migration failed, starting anyway...' && node dist/server.js"]
