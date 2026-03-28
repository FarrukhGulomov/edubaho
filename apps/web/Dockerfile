# ─────────────────────────────────────────────────
# Stage 1: Dependencies
# ─────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/

RUN npm install --frozen-lockfile

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
