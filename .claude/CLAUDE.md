 [Siz EduReyting.uz loyihasida ishlayapsiz.

Har qanday kod yozishdan OLDIN quyidagi fayllarni o'qing:

1. edureyting-docs/README.md
2. Vazifaga tegishli hujjat (quyida ko'rsatilgan)

═══════════════════════════════════════════
LOYIHA: EduReyting.uz
═══════════════════════════════════════════
O'zbekistondagi ta'lim muassasalarini (bog'chalar, maktablar,
universitetlar, o'quv kurslar) qidirish, solishtirish va baholash
uchun two-sided marketplace platforma.

STACK:
  Frontend  → Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui
  Backend   → Fastify (Node.js) + TypeScript
  Database  → PostgreSQL 16 + Prisma ORM
  Search    → Meilisearch
  Cache     → Redis
  Auth      → JWT + SMS OTP (Playmobile)
  Storage   → Cloudflare R2
  Monorepo  → Turborepo

PAPKA STRUKTURASI:
  edureyting/
  ├── apps/api/          ← Fastify backend
  ├── apps/web/          ← Next.js frontend
  └── packages/shared/   ← Umumiy types

═══════════════════════════════════════════
MAJBURIY QOIDALAR (HECH QACHON BUZMA)
═══════════════════════════════════════════

1. UZS FORMAT
   ✅ 1 500 000 so'm   ← bo'shliq ajratuvchi, "so'm" suffiksi
   ❌ 1,500,000 UZS    ← noto'g'ri

2. TIL TIZIMI
   - Barcha content fieldlar JUFT bo'ladi: nameUz / nameRu
   - UI string'lar: { uz: "...", ru: "..." } ob'ekt sifatida
   - Birlamchi: O'zbek (lotin), Ikkilamchi: Rus (kirill)

3. TO'LOV TIZIMLARI
   - Faqat: Payme, Click, Uzcard, Humo, Naqd
   - HECH QACHON: Stripe, PayPal, Visa/MC to'g'ridan-to'g'ri

4. TELEFON FORMATI
   - +998 (90) 123-45-67
   - Faqat O'zbekiston raqamlari (+998)

5. TELEGRAM
   - Har bir sahifada Telegram havolasi bo'lishi shart
   - Uzbekiston startuplari Telegram orqali support beradi

6. XATO XABARLARI
   - Foydalanuvchiga ko'rinadigan barcha xatolar O'zbek tilida
   - { error: "OTP muddati tugagan" } ← O'zbekcha
   - Log'lar ingliz tilida bo'lishi mumkin

7. KOD SIFATI
   - TypeScript strict mode — any ishlatma
   - Har bir API route'da Zod validation
   - Prisma'da N+1 muammosidan saqlaning (include/select)
   - Har bir funksiya uchun JSDoc yoki comment (O'zbekcha)

═══════════════════════════════════════════
HUJJATLAR VA QACHON ISHLATILADI
═══════════════════════════════════════════

Quyidagi fayllarni tegishli vazifa uchun o'qing:

  VAZIFA                          → O'QING
  ──────────────────────────────────────────
  Umumiy loyiha tushunish         → 01-overview.md
  UX, component dizayn            → 02-user-personas.md
  Yangi funksiya qo'shish         → 03-feature-requirements.md
  Package, config, stack          → 04-tech-stack.md
  Setup, deploy, migration        → 06-environment-setup.md
  Prisma schema, DB, SQL          → 07-database-schema.md
  API route, endpoint             → 08-api-routes.md
  Auth, JWT, OTP, middleware      → 09-auth-system.md
  Next.js sahifa, routing, SEO    → 11-pages-sitemap.md
  UZS format, tarjima, i18n       → 13-i18n-formatting.md
  MVP scope, nima qachon          → 15-roadmap.md
  SEO, content, GTM               → 16-marketing-strategy.md

═══════════════════════════════════════════
HARAKAT TARTIBI (HAR DOIM SHUNDAY BO'LSIN)
═══════════════════════════════════════════

1. Vazifani tushun
2. README.md o'qi
3. Tegishli hujjat(lar)ni o'qi
4. Mavjud kod/fayllarni ko'rib chiq (clobber qilma)
5. Kichik bo'laklarga bo'lib yoz
6. Har bir bo'lak yozilgandan keyin test qil
7. O'zbek tilidagi comment qo'sh

═══════════════════════════════════════════
MUAMMO YECHISH TARTIBI
═══════════════════════════════════════════

Agar biror narsa noaniq bo'lsa:
  1. Avval hujjatdan javob izla
  2. Hujjatda yo'q bo'lsa — mavjud kod pattern'ini ko'r
  3. Undayam yo'q bo'lsa — so'ra, taxmin qilma

Agar hujjat bilan kod zid bo'lsa:
  → Hujjatga amal qil, lekin ziddiyat haqida xabar ber

Agar muhim qaror qabul qilish kerak bo'lsa:
  → Variantlarni ko'rsat va tavsiya qil, o'zing qaror qilma]
