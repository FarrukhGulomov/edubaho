# EDUBAHO — Chuqur mahsulot va xavfsizlik tahlili

*Sana: 2026-07-02 · Rollar: Product Manager, Product Designer, Full-stack Developer, Xavfsizlik mutaxassisi*

---

## 1. Mahsulot holati (PM ko'zi bilan)

EDUBAHO — O'zbekiston ta'lim muassasalarini qidirish, solishtirish va baholash platformasi.
Texnik poydevor kuchli: Fastify + Prisma + Meilisearch + Redis, Next.js 15 frontend,
lead-analytics tizimi (`LeadEvent`), B2B dashboard va super-admin panel allaqachon mavjud.

**Kuchli tomonlar:**
- To'liq auth funnel tracking (`auth_started → completed/abandoned`) — konversiyani o'lchash mumkin
- B2B qiymat taklifi tayyor: profil to'liqligi balli, KPI dashboard, subscription modeli
- Ikki tilli (uz/ru) arxitektura izchil qo'llangan

**Asosiy xavf (biznes):** Supply-demand muvozanati. Sharhlar bo'lmasa foydalanuvchi qaytmaydi,
foydalanuvchi bo'lmasa muassasa pul to'lamaydi. MVP bosqichida **kontent to'ldirish**
(seed muassasalar + birinchi 1000 sharh) eng muhim ish.

## 2. UX flow tahlili (dizayner ko'zi bilan)

### Tuzatildi (shu PR'da)

| Muammo | Yechim |
|---|---|
| SMS orqali kirish formasi `{false && ...}` bilan butunlay yashirilgan edi — Telegram'i yo'q foydalanuvchi umuman kira olmasdi (katta konversiya to'sig'i) | SMS forma qayta yoqildi, Telegram bilan yonma-yon «yoki» ajratuvchisi bilan |
| «Kodni qayta yuborish» tugmasi foydalanuvchini telefon bosqichiga qaytarardi (qadam yo'qotish) | Endi kod to'g'ridan-to'g'ri qayta yuboriladi, taymer qayta boshlanadi, fokus OTP maydonida qoladi |

### Keyingi tavsiyalar (roadmap)

1. **Onboarding savoli** — birinchi kirishda «Kimni qidiryapsiz?» (bog'cha/maktab/kurs + shahar) → shaxsiylashtirilgan bosh sahifa.
2. **Bo'sh holatlar (empty states)** — qidiruvda natija yo'q bo'lsa: yaqin shaharlar, o'xshash turlar taklifi + «Muassasangiz yo'qmi? Qo'shing» CTA (B2B lead).
3. **Sharh yozish friksiyasini kamaytirish** — avval yulduz, keyin matn; matnni ixtiyoriy minimal qilish; yozgandan keyin «yana 2 ta sharh yozing» gamifikatsiyasi.
4. **Solishtirish (compare)** ni mobil'da floating bar bilan ko'rsatish — hozirgi flow desktop-ga moslashgan.
5. **Guest gate'ni yumshatish** — kontakt ko'rish uchun auth talab qilinsa, avval qiymat ko'rsatib keyin so'rash (gate_shown → auth_completed konversiyasini analytics'da kuzatish allaqachon bor).

## 3. O'sish (growth) tavsiyalari

- **SEO landing'lar**: `/toshkent/bogchalar`, `/samarqand/it-kurslar` kabi shahar×tur sahifalari — Meilisearch facet'lari tayyor, faqat routing va metadata kerak. O'zbek qidiruv trafigining asosiy manbai bo'ladi.
- **Telegram bot** — sharh moderatsiyasi natijasi, saqlangan muassasa yangiliklari haqida push. Telegram login allaqachon bor, bot infratuzilmasi 50% tayyor.
- **Sharh uchun rag'bat** — «Tasdiqlangan ota-ona» nishoni, muassasa javob berganida xabar.
- **B2B funnel** — profil to'liqligi < 60% bo'lgan muassasa egalariga haftalik eslatma (retention).

## 4. Xavfsizlik auditi

### Tuzatildi (shu PR'da)

| # | Topilma | Xavf darajasi | Yechim |
|---|---|---|---|
| 1 | `/auth/setup-super-admin` — autentifikatsiyasiz, faqat PIN bilan SUPER_ADMIN olish mumkin edi, PIN default `1234` | **Kritik** | Endpoint faqat DB'da super admin yo'q bo'lganda ishlaydi (bootstrap), 3 so'rov/soat limit, timing-safe PIN |
| 2 | OTP `Math.random()` bilan yaratilardi — bashorat qilinishi mumkin | **Yuqori** | `crypto.randomInt()` |
| 3 | `verify-otp` da urinishlar cheklovi yo'q edi — 6 xonali kodni brute-force qilish mumkin | **Yuqori** | OTP boshiga maks. 5 urinish, keyin OTP bekor; route'ga 10 so'rov/min limit |
| 4 | `/track` route JWT'ni **imzosiz** (`decode`) o'qirdi — istalgan `userId` ni soxtalashtirib analytics'ni buzish mumkin edi | **Yuqori** | `jwt.verify` (imzo tekshiriladi) |
| 5 | `send-otp` da per-IP limit yo'q — SMS pumping (moliyaviy zarar) | **O'rta** | 5 so'rov/min/IP + bitta raqamga 5 SMS/soat |
| 6 | `admin-pin` brute-force himoyasiz | **O'rta** | 5 urinish / 15 daqiqa / foydalanuvchi |
| 7 | ADMIN_PIN default qiymat bilan production'ga chiqishi mumkin edi | **O'rta** | Production'da zaif PIN / bir xil secretlar / ALLOW_DEV_OTP bo'lsa server ishga tushmaydi |
| 8 | Security headerlar yo'q edi | **Past** | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, HSTS (prod) |
| 9 | OTP/PIN/Telegram hash oddiy `===` bilan solishtirilardi (timing attack) | **Past** | `crypto.timingSafeEqual` |
| 10 | `revokeAllTokens` da `redis.keys` — Redis'ni bloklaydi | **Past** | `SCAN` bilan almashtirildi |

### Qolgan tavsiyalar (alohida ishlar)

1. **Tokenlar `localStorage`da** — XSS bo'lsa o'g'irlanadi. Refresh tokenni `httpOnly` cookie'ga ko'chirish tavsiya etiladi (frontend+backend refactor).
2. **Admin PIN o'rniga TOTP** (Google Authenticator) — umumiy PIN o'rniga har bir admin uchun individual 2FA.
3. **Fayl yuklashda content-type/magic-byte tekshiruvi** — R2 storage yoqilganda rasm validatsiyasi shart.
4. **Audit log** — admin amallari (muassasa o'chirish, rol berish) uchun kim-qachon-nima jadvali.
5. **CSP header** frontend (Next.js) tomonida — Telegram widget uchun `telegram.org` ruxsati bilan.
6. **Dependency skanerlash** — CI'ga `npm audit` qo'shish.

## 5. Autentifikatsiya strategiyasi (yangilangan)

Foydalanuvchi endi 3 usulda kira oladi — hammasi parolsiz:

| Usul | Kim uchun | Izoh |
|---|---|---|
| **Telegram** | Asosiy (O'zbekistonda eng ommabop) | Login Widget, bir bosishda |
| **SMS OTP** | Telegram'i yo'qlar | Playmobile orqali, 6 xonali kod |
| **Google (Gmail)** | Desktop/xorijiy foydalanuvchilar | GIS ID token, backend'da tokeninfo orqali tekshiriladi |

Bitta odam bir nechta usul bilan kirsa: Google email allaqachon ro'yxatda bo'lsa hisobga
avtomatik bog'lanadi (`googleId` → mavjud user).

### Hamkorlar (o'quv markazlari) uchun kirish

O'zbekistonda ko'p o'quv markazlarida korporativ pochta YO'Q — shuning uchun
**alohida «biznes-login» qilinmadi**. Optimal yechim — **claim (egalik so'rovi) oqimi**:

1. Muassasa vakili oddiy usulda kiradi (telefon/Telegram/Gmail — qaysi biri qulay bo'lsa)
2. Muassasa sahifasida **«Bu muassasa siznikimi?»** kartasi orqali so'rov yuboradi
   (lavozim + aloqa telefoni + izoh)
3. Admin `/admin/claims` da so'rovni ko'rib chiqadi, kerak bo'lsa telefon orqali tekshiradi
4. Tasdiqlangach: foydalanuvchi `INSTITUTION_OWNER` roliga o'tadi, muassasa `verified`
   belgisini oladi, B2B dashboard ochiladi

Bu yondashuv email-domen tekshiruviga qaraganda O'zbekiston bozoriga mos: ishonch
moderatsiya orqali quriladi, texnik to'siq esa nolga teng.

## 6. Texnik qarz

- `apps/api` typecheck'da Prisma client generatsiyasiz ko'p xato — CI'da `prisma generate` + `tsc --noEmit` bosqichi kerak.
- `InstitutionDetail.tsx`da `city` maydoni type'da yo'q (mavjud xato) — shared types yangilash kerak.
- `mock-api.js` (27KB) ildizda qolgan — kerak bo'lmasa o'chirish.
- CLAUDE.md'da tilga olingan `edureyting-docs/` papkasi repoda yo'q — hujjatlarni repoga qo'shish yoki yo'lni yangilash.
