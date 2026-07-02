# EDUBAHO — Production Deploy Qo'llanmasi

Arxitektura: **API → Railway**, **Web → Vercel**, **DB/Redis → Railway**.

```
[Foydalanuvchi] → Vercel (Next.js) → Railway (Fastify API) → Railway Postgres
                                                           → Railway Redis
                                                           → Meilisearch (ixtiyoriy)
                                                           → Cloudflare R2 (ixtiyoriy)
```

---

## 1-qadam. Railway: Database va Redis

1. [railway.app](https://railway.app) da yangi Project yarating (masalan, `edubaho`)
2. **+ New → Database → PostgreSQL** qo'shing
3. **+ New → Database → Redis** qo'shing

Hech narsa sozlash shart emas — connection stringlar avtomatik yaratiladi.

## 2-qadam. Railway: API servis

1. **+ New → GitHub Repo** → `edubaho` repozitoriyni tanlang
2. Service Settings:
   - **Root Directory**: `apps/api`
   - Build/start buyruqlari `apps/api/railway.json` dan avtomatik olinadi
     (build: `npm run build`, start: `npm run start:prod` — migratsiyalar avtomatik qo'llanadi)
3. **Variables** bo'limida quyidagilarni kiriting
   (to'liq ro'yxat va izohlar: `apps/api/.env.example`):

   | O'zgaruvchi | Qiymat |
   |---|---|
   | `DATABASE_URL` | Reference → Postgres → `DATABASE_URL` |
   | `DIRECT_URL` | Reference → Postgres → `DATABASE_URL` (bir xil qiymat) |
   | `REDIS_URL` | Reference → Redis → `REDIS_URL` |
   | `JWT_SECRET` | `openssl rand -hex 32` natijasi |
   | `REFRESH_SECRET` | boshqa `openssl rand -hex 32` natijasi |
   | `NODE_ENV` | `production` |
   | `PORT` | `3001` |
   | `ALLOWED_ORIGINS` | Vercel domeningiz (masalan `https://edubaho.vercel.app`) — 4-qadamdan keyin yangilang |
   | `ADMIN_PIN` | kuchli PIN (kamida 6 belgi; `1234`/`147258` bilan server ishga tushmaydi) |
   | `SMS_LOGIN`/`SMS_PASSWORD` | Playmobile hisobingiz (bo'lmasa OTP faqat logda) |
   | `TELEGRAM_BOT_TOKEN` | @BotFather'dan (ixtiyoriy) |
   | `GOOGLE_CLIENT_ID` | Google Cloud Console'dan (ixtiyoriy) |

4. **Settings → Networking → Generate Domain** — API uchun public domen oling
   (masalan `edubaho-api.up.railway.app`)
5. Deploy tugagach tekshiring: `https://<api-domen>/health` → `{"status":"ok"}`

## 3-qadam. Ma'lumotlar bazasini to'ldirish (seed)

Railway CLI orqali (bir marta):

```bash
npm i -g @railway/cli
railway login
railway link          # loyihani tanlang
railway run --service <api-service> npm run db:seed:prod
```

Yoki lokal mashinadan (Railway Postgres'ning public connection stringi bilan):

```bash
cd apps/api
DATABASE_URL="<railway-postgres-public-url>" DIRECT_URL="<shu-url>" npm run db:seed:prod
```

## 4-qadam. Vercel: Web

1. [vercel.com](https://vercel.com) → **Add New → Project** → repozitoriyni import qiling
2. Sozlamalar:
   - **Root Directory**: `apps/web`
   - **Framework Preset**: Next.js (avtomatik)
   - Install/build buyruqlarini o'zgartirish shart emas — Vercel monorepo
     workspace'larni o'zi aniqlaydi
3. **Environment Variables** (to'liq izohlar: `apps/web/.env.example`):

   | O'zgaruvchi | Qiymat |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://<railway-api-domen>/api/v1` |
   | `NEXT_PUBLIC_SITE_URL` | Vercel domeningiz yoki custom domen |
   | `NEXT_PUBLIC_APP_NAME` | `EDUBAHO` |
   | `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | bot username (ixtiyoriy) |
   | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | API'dagi bilan bir xil (ixtiyoriy) |

4. Deploy → domen olasiz (masalan `edubaho.vercel.app`)
5. **Railway'ga qaytib** `ALLOWED_ORIGINS` ni shu domenga yangilang (CORS)

## 5-qadam. Birinchi Super Admin

Faqat DB'da hali super admin yo'q bo'lganda ishlaydi (bootstrap):

```bash
curl -X POST https://<api-domen>/api/v1/auth/setup-super-admin \
  -H "Content-Type: application/json" \
  -d '{"phone":"+998901234567","pin":"<ADMIN_PIN>"}'
```

Keyin `https://<web-domen>/admin/login` orqali kiring
(telefon → OTP → ADMIN_PIN). Keyingi adminlar faqat super admin panelidan tayinlanadi.

## 6-qadam (ixtiyoriy). Meilisearch

Meilisearch'siz ham qidiruv ishlaydi (PostgreSQL fallback). Kuchli qidiruv uchun:

1. Railway → **+ New → Template → Meilisearch** (yoki [Meilisearch Cloud](https://cloud.meilisearch.com))
2. API servisga qo'shing: `MEILISEARCH_URL`, `MEILISEARCH_KEY` (master key)

## 7-qadam (ixtiyoriy). Cloudflare R2 (rasm yuklash)

1. Cloudflare Dashboard → R2 → bucket yarating (`edubaho-media`)
2. R2 API Token yarating (Object Read & Write)
3. API servisga: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`
4. Bucket'ga public domen ulang va `R2_PUBLIC_URL` ga yozing —
   `apps/web/next.config.ts` da `**.r2.dev` allaqachon ruxsat etilgan

## 8-qadam (ixtiyoriy). Telegram va Google login

**Telegram:** @BotFather → `/newbot` → token'ni `TELEGRAM_BOT_TOKEN` ga.
Keyin `/setdomain` bilan web domeningizni bog'lang (masalan `edubaho.vercel.app`).

**Google:** [console.cloud.google.com](https://console.cloud.google.com/apis/credentials)
→ OAuth Client ID (Web application) → Authorized JavaScript origins'ga web domeningizni
qo'shing → Client ID'ni API (`GOOGLE_CLIENT_ID`) va Vercel
(`NEXT_PUBLIC_GOOGLE_CLIENT_ID`) ga kiriting.

---

## Go-live tekshiruv ro'yxati

- [ ] `https://<api>/health` → `{"status":"ok"}`
- [ ] `NODE_ENV=production` (Railway API)
- [ ] `JWT_SECRET` ≠ `REFRESH_SECRET`, har biri 32+ belgi
- [ ] `ADMIN_PIN` kuchli (default emas)
- [ ] `ALLOWED_ORIGINS` faqat o'z domenlaringiz
- [ ] `ALLOW_DEV_OTP` O'RNATILMAGAN
- [ ] Super admin yaratildi va `/admin` ochiladi
- [ ] Seed ma'lumotlar ko'rinadi (bosh sahifada muassasalar)
- [ ] SMS yuborilishi tekshirildi (Playmobile balansini tekshiring)
- [ ] Telegram login ishlaydi (agar yoqilgan bo'lsa)
- [ ] `/match` wizard natija qaytaradi

## Muammolarni hal qilish

| Belgisi | Sabab / Yechim |
|---|---|
| Server ishga tushmayapti, logda "Production xavfsizlik talablari" | Zaif `ADMIN_PIN` yoki bir xil secretlar — env'ni to'g'rilang |
| CORS xatosi browserda | `ALLOWED_ORIGINS` da web domeni yo'q yoki oxirida `/` bor |
| `Environment variable not found: DIRECT_URL` | Railway'da `DIRECT_URL` qo'shing (DATABASE_URL bilan bir xil) |
| OTP kelmayapti | `SMS_LOGIN` bo'sh — Railway loglarida `📱 OTP [...]` ko'rinadi |
| 429 xatolar ko'p | Normal — rate limit ishlayapti; `trustProxy` yoqilganini tekshiring |
| Rasm ko'rinmayapti | `R2_PUBLIC_URL` domeni `next.config.ts` remotePatterns'da bo'lishi kerak |
