# EDUBAHO — Production Deploy Qo'llanmasi (Docker + Railway)

Barcha servislar **bitta Railway project**ida, **Docker** orqali ishga tushiriladi:

```
Railway project "edubaho"
├── Postgres      — managed database
├── Redis         — managed cache/session
├── api           — Dockerfile: apps/api/Dockerfile
└── web           — Dockerfile: apps/web/Dockerfile
```

Har bir servis o'zining `Dockerfile`i orqali build bo'ladi (Nixpacks/Railpack
ishlatilmaydi) — bu avvalgi "monorepo'ni Railway noto'g'ri build qildi"
muammosini butunlay bartaraf etadi, chunki build jarayoni endi to'liq
bizning nazoratimizda: `apps/api/Dockerfile` va `apps/web/Dockerfile`.

---

## ⚠️ ENG MUHIM QOIDA — Root Directory

**Ikkala servis uchun ham Root Directory'ni BO'SH qoldiring** (repo ildizi).

Sabab: `Dockerfile`lar ichidagi `COPY` buyruqlari repo ildiziga nisbatan
yozilgan (`COPY packages/shared/package.json ./packages/shared/` va h.k.),
chunki bu Turborepo monorepo — API va Web ikkalasi ham `packages/shared`ga
bog'liq. Agar Root Directory'ni `apps/api` yoki `apps/web` qilib qo'ysangiz,
Docker build context faqat o'sha papka bilan cheklanadi va `packages/shared`
topilmay build ishlamay qoladi.

Buning o'rniga build kontekstini repo ildizida qoldirib, **faqat Dockerfile
manzilini** ko'rsatamiz — buni har bir servis Settings'ida alohida qilamiz
(quyida 2- va 3-qadamlarda).

---

## 1-qadam. Railway: yangi project + Postgres + Redis

1. [railway.app](https://railway.app) → **New Project** → nom bering (`edubaho`)
2. **+ New → Database → PostgreSQL** qo'shing
3. **+ New → Database → Redis** qo'shing

Hech narsa qo'shimcha sozlash shart emas — connection stringlar avtomatik yaratiladi.

## 2-qadam. `api` servisi

1. **+ New → GitHub Repo** → `edubaho` repozitoriyni tanlang (bu birinchi servis)
2. **Settings → Source**:
   - **Root Directory**: **bo'sh qoldiring**
3. **Settings → Build**:
   - **Builder**: `Dockerfile`
   - **Dockerfile Path**: `apps/api/Dockerfile`

   (Bu sozlama `apps/api/railway.json` faylida ham yozilgan, lekin Root
   Directory bo'sh bo'lgani uchun Railway uni avtomatik topmasligi mumkin —
   shu ikki maydonni Dashboard'da qo'lda kiritish eng ishonchli yo'l.)

4. **Variables** bo'limiga kiriting (to'liq izohlar: `apps/api/.env.example`):

   | O'zgaruvchi | Qiymat |
   |---|---|
   | `DATABASE_URL` | Reference → Postgres → `DATABASE_URL` |
   | `DIRECT_URL` | Reference → Postgres → `DATABASE_URL` (bir xil qiymat) |
   | `REDIS_URL` | Reference → Redis → `REDIS_URL` |
   | `JWT_SECRET` | `openssl rand -hex 32` natijasi |
   | `REFRESH_SECRET` | boshqa `openssl rand -hex 32` natijasi |
   | `NODE_ENV` | `production` |
   | `ALLOWED_ORIGINS` | Web servis domeni (3-qadamdan keyin yangilanadi) |
   | `ADMIN_PIN` | kuchli PIN (kamida 6 belgi; `1234`/`147258` bilan server ishga tushmaydi) |
   | `SMS_LOGIN` / `SMS_PASSWORD` | Playmobile hisobingiz (bo'lmasa OTP faqat logda) |
   | `TELEGRAM_BOT_TOKEN` | @BotFather'dan (ixtiyoriy) |
   | `GOOGLE_CLIENT_ID` | Google Cloud Console'dan (ixtiyoriy) |

   `PORT`ni **qo'lda kiritmang** — Railway uni avtomatik beradi, server
   `env.PORT` orqali shuni o'qiydi.

5. **Settings → Networking → Generate Domain** — public domen oling
   (masalan `edubaho-api-production.up.railway.app`)
6. Deploy tugagach: `https://<api-domen>/health` → `{"status":"ok"}`

## 3-qadam. `web` servisi

1. Bir xil Railway project ichida **+ New → GitHub Repo** → **yana o'sha
   `edubaho` repozitoriyni tanlang** (ha, bir xil repo — bu ikkinchi, alohida
   servis bo'ladi)
2. **Settings → Source**:
   - **Root Directory**: **bo'sh qoldiring** (2-qadamdagi qoida bilan bir xil sabab)
3. **Settings → Build**:
   - **Builder**: `Dockerfile`
   - **Dockerfile Path**: `apps/web/Dockerfile`
4. **Variables** bo'limiga kiriting:

   | O'zgaruvchi | Qiymat |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://<api-domen>/api/v1` (2-qadamdagi domen) |
   | `NEXT_PUBLIC_SITE_URL` | shu servisning domeni (keyin to'ldirasiz) |
   | `NEXT_PUBLIC_APP_NAME` | `EDUBAHO` |
   | `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | bot username (ixtiyoriy) |
   | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | API'dagi `GOOGLE_CLIENT_ID` bilan bir xil (ixtiyoriy) |

   **Muhim:** `NEXT_PUBLIC_*` qiymatlar Next.js tomonidan **build vaqtida**
   client kodga yoziladi. `apps/web/Dockerfile` bu o'zgaruvchilarni `ARG`
   sifatida kutadi — Railway Dockerfile builder ishlatilganda servisga
   qo'shilgan barcha Variables avtomatik ravishda mos nomli `ARG`larga
   uzatiladi, qo'shimcha sozlash shart emas.

5. **Settings → Networking → Generate Domain** — domen oling
   (masalan `edubaho-web-production.up.railway.app`)
6. Shu domenni `NEXT_PUBLIC_SITE_URL`ga yozing va **qayta deploy** qiling
   (NEXT_PUBLIC_* build-time bo'lgani uchun qiymat o'zgarsa qayta build kerak)

## 4-qadam. CORS'ni ulash

`api` servisiga qaytib, `ALLOWED_ORIGINS`ni `web` servisining domeniga yangilang:
```
ALLOWED_ORIGINS=https://<web-domen>
```
(Telegram Mini App yoki custom domen qo'shsangiz, vergul bilan ajratib qo'shing.)

## 5-qadam. Ma'lumotlar bazasini to'ldirish (seed)

`apps/api/Dockerfile`ning `CMD`i har safar konteyner ishga tushganda
**faqat migratsiyalarni** qo'llaydi (`prisma migrate deploy`) — bu xavfsiz
va idempotent. **Seed avtomatik ishlamaydi**, chunki u har restart'da
ishlasa, adminlar o'chirgan yozuvlarni ham qayta tiklab qo'yishi mumkin edi.

Birinchi deploy'dan keyin, bazani **bir marta** to'ldirish uchun eng oson yo'l:

1. Railway'da `api` servis → **Variables** → qo'shing: `RUN_SEED` = `true`
2. Servis avtomatik qayta deploy bo'ladi — ishga tushishda seed bajariladi
   (Deploy Logs'da «Seed muvaffaqiyatli yakunlandi» ko'rinadi)
3. Ma'lumot kirganini saytda tekshirib, **`RUN_SEED`ni o'chirib tashlang**
   (doimiy yoqiq qolmasin)

Muqobil (Railway CLI orqali): `railway run --service api npm run db:seed:prod`

Bu 31 ta real muassasa (Najot Ta'lim, PDP Academy va h.k.) va 14 ta viloyat
ma'lumotini yozadi. Skript **idempotent** — upsert asosida, xavfsiz qayta
ishga tushirish mumkin (dublikat yaratmaydi).

## 6-qadam. Birinchi Super Admin

Faqat DB'da hali super admin yo'q bo'lganda ishlaydi (bootstrap, keyin o'zi yopiladi):

```bash
curl -X POST https://<api-domen>/api/v1/auth/setup-super-admin \
  -H "Content-Type: application/json" \
  -d '{"phone":"+998901234567","pin":"<ADMIN_PIN>"}'
```

Keyin `https://<web-domen>/admin/login` orqali kiring
(telefon → OTP → ADMIN_PIN). Keyingi adminlar faqat super admin panelidan tayinlanadi.

## 7-qadam (ixtiyoriy). Meilisearch

Meilisearch'siz ham qidiruv ishlaydi (PostgreSQL fallback). Kuchli qidiruv uchun:

1. Railway → **+ New → Template → Meilisearch** (yoki [Meilisearch Cloud](https://cloud.meilisearch.com))
2. `api` servisga qo'shing: `MEILISEARCH_URL`, `MEILISEARCH_KEY` (master key)

## 8-qadam (ixtiyoriy). Cloudflare R2 (rasm yuklash)

1. Cloudflare Dashboard → R2 → bucket yarating (`edubaho-media`)
2. R2 API Token yarating (Object Read & Write)
3. `api` servisga: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`
4. Bucket'ga public domen ulang va `R2_PUBLIC_URL`ga yozing —
   `apps/web/next.config.ts`da `**.r2.dev` allaqachon ruxsat etilgan

## 9-qadam (ixtiyoriy). Telegram va Google login

**Telegram:** @BotFather → `/newbot` → token'ni `api`ning `TELEGRAM_BOT_TOKEN`iga.
Keyin `/setdomain` bilan web domeningizni bog'lang.

**Google:** [console.cloud.google.com](https://console.cloud.google.com/apis/credentials)
→ OAuth Client ID (Web application) → Authorized JavaScript origins'ga web
domeningizni qo'shing → Client ID'ni `api` (`GOOGLE_CLIENT_ID`) va `web`
(`NEXT_PUBLIC_GOOGLE_CLIENT_ID`) servislariga kiriting.

## 10-qadam. Telegram Mini App (Web App)

Sayt Telegram ichida to'liq ishlaydi: foydalanuvchi **avtomatik tizimga kiradi**
(initData orqali), native Back tugmasi va haptic feedback ishlaydi.

1. @BotFather → `/newapp` → botingizni tanlang
   - **Web App URL**: `https://<web-domeningiz>` (HTTPS shart)
2. @BotFather → `/mybots` → botingiz → **Bot Settings → Menu Button** →
   Web App URL'ni kiriting
3. Kanal/guruh postlarida to'g'ridan-to'g'ri havola:
   `https://t.me/<bot_username>/<app_qisqa_nomi>`

Qo'shimcha sozlama kerak emas — `TELEGRAM_BOT_TOKEN` allaqachon `/auth/telegram-webapp`
uchun ham ishlatiladi.

---

## Lokalda Docker image'larni sinash (ixtiyoriy, tavsiya etiladi)

Railway'ga push qilishdan oldin ikkala image'ni lokal Docker'da qurib ko'rish
mumkin:

```bash
# API
docker build -f apps/api/Dockerfile -t edubaho-api .
docker run --rm -p 3001:3001 --env-file apps/api/.env edubaho-api

# Web
docker build -f apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1 \
  --build-arg NEXT_PUBLIC_SITE_URL=http://localhost:3000 \
  --build-arg NEXT_PUBLIC_APP_NAME=EDUBAHO \
  -t edubaho-web .
docker run --rm -p 3000:3000 edubaho-web
```

Ikkala buyruq ham **repo ildizidan** ishga tushirilishi kerak (`-f` bilan
Dockerfile manzili ko'rsatilgan, lekin build context — oxirgi `.` — repo
ildizi bo'lishi shart, yuqoridagi qoida bilan bir xil sabab).

---

## Go-live tekshiruv ro'yxati

- [ ] `api` va `web` servislarida Root Directory **bo'sh**
- [ ] `api`: Builder=Dockerfile, Dockerfile Path=`apps/api/Dockerfile`
- [ ] `web`: Builder=Dockerfile, Dockerfile Path=`apps/web/Dockerfile`
- [ ] `https://<api>/health` → `{"status":"ok"}`
- [ ] `NODE_ENV=production` (api)
- [ ] `JWT_SECRET` ≠ `REFRESH_SECRET`, har biri 32+ belgi
- [ ] `ADMIN_PIN` kuchli (default emas)
- [ ] `ALLOWED_ORIGINS` faqat o'z domenlaringiz
- [ ] `ALLOW_DEV_OTP` O'RNATILMAGAN
- [ ] Super admin yaratildi va `/admin` ochiladi
- [ ] Seed ma'lumotlar ko'rinadi (bosh sahifada muassasalar)
- [ ] SMS yuborilishi tekshirildi (Playmobile balansini tekshiring)
- [ ] `/match` wizard natija qaytaradi

## Muammolarni hal qilish

| Belgisi | Sabab / Yechim |
|---|---|
| `packages/shared` topilmadi / build xatosi | Root Directory bo'sh emas — uni tozalang, faqat Dockerfile Path'ni sozlang |
| Railway "static site" yoki `RAILPACK_SPA_OUTPUT_DIR` haqida yozadi | Builder hali `Dockerfile`ga o'zgartirilmagan — Settings → Build tekshiring |
| `next build`da `NEXT_PUBLIC_*` bo'sh chiqadi | Railway Variables'ga qo'shilgan, lekin build keshi eski — "Redeploy"ni majburiy qiling |
| Server ishga tushmayapti, logda "Production xavfsizlik talablari" | Zaif `ADMIN_PIN` yoki bir xil secretlar — env'ni to'g'rilang |
| CORS xatosi browserda | `ALLOWED_ORIGINS`da web domeni yo'q yoki oxirida `/` bor |
| `Environment variable not found: DIRECT_URL` | `DIRECT_URL`ni qo'shing (DATABASE_URL bilan bir xil) |
| OTP kelmayapti | `SMS_LOGIN` bo'sh — Railway loglarida `📱 OTP [...]` ko'rinadi |
| Rasm ko'rinmayapti | `R2_PUBLIC_URL` domeni `next.config.ts` remotePatterns'da bo'lishi kerak |
