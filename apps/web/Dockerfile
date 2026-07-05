# ─────────────────────────────────────────────────
# Stage 1: Dependencies
# ─────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/

RUN npm ci

# ─────────────────────────────────────────────────
# Stage 2: Build
# ─────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# npm workspaces: barcha node_modules root da hoisted
COPY --from=deps /app/node_modules ./node_modules

COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
COPY package.json ./

# Next.js standalone build uchun
ENV NEXT_TELEMETRY_DISABLED=1

# Build vaqtida Railway env o'zgaruvchilarini qabul qilish.
# MUHIM: NEXT_PUBLIC_* qiymatlar Next.js tomonidan BUILD vaqtida client
# bundle'ga yozib qo'yiladi — shuning uchun ENV emas, ARG orqali kelishi
# va build'dan oldin ENV'ga o'tkazilishi shart. Railway'da bu qiymatlarni
# servisning "Variables" bo'limiga oddiy qo'shsangiz kifoya — Dockerfile
# builder ARG nomi mos kelgan barcha o'zgaruvchilarni avtomatik uzatadi.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_APP_NAME
ARG NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG NEXT_PUBLIC_GOOGLE_MAPS_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME \
    NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=$NEXT_PUBLIC_TELEGRAM_BOT_USERNAME \
    NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID \
    NEXT_PUBLIC_GOOGLE_MAPS_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_KEY

RUN cd apps/web && npm run build

# ─────────────────────────────────────────────────
# Stage 3: Production runner
# ─────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js build output
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
