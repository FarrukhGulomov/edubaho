# BilimOn — UX Audit

**Sana:** 2026-09-09 · **Repository:** github.com/FarrukhGulomov/edubaho
**Default branch:** `master` · **Tekshirilgan branch/commit:** `claude/project-analysis-platform-dev-vgvrtc` @ `a1d4b506071d74f7a1eac5248c0849d0f7415aab` (bu commit `master`ning HEAD'i bilan bir xil — ikkalasi ham sinxron)
**Muhit:** lokal dev (Postgres 16 + Redis + Fastify API :3001 + Next.js 15 web :3000), seed skripti bilan yaratilgan 42 ta muassasa, 14 viloyat. Production emas — production'dagi haqiqiy ma'lumot/traffic bilan farqlanishi mumkin, bu farqlar quyida alohida qayd etilgan.
**Rollar:** Senior UX Researcher / Product Designer / UX Writer / Product Analyst / Frontend Engineer / QA (bitta audit ovozida birlashtirilgan).

---

## 0. Mahsulot va foydalanuvchi yo'li (bir jumlada)

BilimOn — O'zbekistondagi ta'lim muassasalarini (asosan o'quv/til markazlari, shuningdek maktab/bog'cha/universitet) qidirish, EduFit moslik-vizardi orqali shaxsiylashtirilgan tavsiya olish, solishtirish va murojaat/sinov darsiga yozilish orqali qaror qabul qilishga yordam beruvchi ikki tomonlama marketplace.

Asosiy yo'l: **Bosh sahifa → Qidiruv/Mos tanlash → Muassasa sahifasi → Solishtirish (ixtiyoriy) → Ro'yxatdan o'tish → Murojaat/Probnoy darsga yozilish.**

---

## 1. Hujjat va kod solishtiruvi — muhim ziddiyatlar

| Hujjat da'vosi | Amaldagi kod/xatti-harakat | Xulosa |
|---|---|---|
| `docs/ALGORITM.md`: EduFit "5 savol (tur → maqsad → shahar → byudjet → vaqt/yosh)" | `/match` sahifasida haqiqatda **4 savol**: Maqsad → Format → Shahar → Byudjet (progress bar ham "4 ta savol" deydi) | Hujjat eskirgan — tur-tanlash bosqichi keyinroq olib tashlangan, hujjat yangilanmagan |
| `DEV.md`: "Tasdiqlangach: foydalanuvchi INSTITUTION_OWNER roliga o'tadi... B2B dashboard ochiladi" | Claim tasdiqlangach (real API orqali sinaldi), `/dashboard` **"Dashboard tez orada! ... Biz siz bilan bog'lanamiz"** platsholderini ko'rsatadi | Hujjat B2B panelni tayyor deb tasvirlaydi, aslida qo'lda tasdiqlash bosqichi bor (UX-007) |
| `docs/TAHLIL.md` (2026-07-02): "Sharh yozish friksiyasini kamaytirish... matnni ixtiyoriy minimal qilish" | Sharh formasida "Sharh matni *" hali ham **majburiy** (`required`) | Tavsiya hali amalga oshirilmagan — yangi bug emas, ochiq roadmap band |
| `.claude/CLAUDE.md`: "edureyting-docs/README.md"ni o'qing | Bu papka repoda **mavjud emas** (`docs/TAHLIL.md`, `docs/ALGORITM.md` bor, boshqa nomlar bilan) | `TAHLIL.md`da ham xuddi shu narsa qayd etilgan (texnik qarz #5) — hali tuzatilmagan |
| `AGENTS.md` | Repoda **topilmadi** | Cheklov sifatida qayd etiladi, izlanish shu asosda davom ettirildi |

---

## 2. Qamrov jadvali

| Sahifa/ssenariy | Til | Qurilma (px) | Usul | Natija | Cheklov |
|---|---|---|---|---|---|
| `/` bosh sahifa | uz+ru | 360/390/768/1440 | Playwright + axe-core + qo'lda ko'rish | ✅ ishlaydi, gorizontal overflow yo'q | — |
| `/search` (filtr, bo'sh natija, back-nav) | uz | 390/1440 | Playwright + axe | ✅ ishlaydi; scroll qaytmaydi (UX-003) | 360/768'da chuqur tekshirilmadi |
| `/[city]/[topic]` (`/toshkent/ielts`) | uz | 390 | Playwright | ✅ ishlaydi, kontent mos | ru va boshqa shahar/mavzu kombinatsiyalari sinalmadi |
| `/institutions/[slug]` (mehmon + login) | uz | 390/1440 | Playwright + axe | ✅ narx/manzil/filiallar/CTA aniq; telefon format buzilgan (UX-005) | Telegram/Instagram tugmalarining haqiqiy havolasi sinalmadi (sandbox tarmoq cheklovi) |
| `/compare` (qo'shish/olib tashlash) | uz | 390/1440 | Playwright | ✅ localStorage'da to'g'ri saqlanadi; mobil pastki panel asosiy navigatsiyani yopadi (UX-001) | — |
| `/match` (EduFit vizard) | uz/ru | 390 | Playwright, real qadam bosib chiqildi | ✅ 4 qadam, natija sahifasi shaffof (% + sabablar) | Barcha filial/format kombinatsiyalari sinalmadi |
| Probnoy darsga bron (UTP#2) | uz | 390 | Playwright, login holatda | ✅ forma ochiladi; bonus-toast forma ustiga chiqadi (UX-006) | Real bron yuborilmadi (audit qoidasiga ko'ra) |
| Sharh yozish | uz | 390 | Playwright, login holatda | ✅ forma ochiladi, struktura tushunarli; matn hali majburiy | Real sharh yuborilmadi |
| ClaimInstitution ("Bu muassasa siznikimi?") | uz | 390 | Playwright + real API (test hisobda) | ✅ tasdiqlangan muassasada yashirin, tasdiqlanmaganda aniq matn bilan chiqadi | — |
| `/auth` (Telegram/Google/OTP) | uz | 390 | Kod audit + Playwright | ⚠️ SMS forma kodda o'chirilgan (`PHONE_AUTH_ENABLED=false`); Telegram/Google skriptlari sandbox tarmog'ida yuklanmadi | **Tekshirilmagan**: real Telegram/Google widget rendering — production tarmog'i kerak. Kod darajasida bo'sh-holat xavfi aniqlandi (UX-002) |
| `/profile` (Tavsiyalar/Bonuslar/Sozlamalar) | uz | 390/1440 | Playwright, test hisob bilan (real OTP emas, dev-otp) | ✅ ishlaydi; "5 ta savol" matni eskirgan (UX-011) | Referral/Bonuslar tab chuqur sinalmadi |
| `/dashboard` (B2B, INSTITUTION_OWNER) | uz | 390/1440 | Real claim→approve API + login | ⚠️ "tez orada" platsholder (UX-007) | Haqiqiy B2B panel kontenti umuman yo'q — sinab bo'lmadi |
| `/admin`, `/admin/institutions`, `/admin/leads`, `/admin/trial-bookings` | uz | 1440 | Real admin login + PIN (test hisob) | ✅ funksional, tushunarli | `/admin/reviews`, `/admin/super/*` chuqur sinalmadi |
| uz→ru almashtirish + qidiruv→muassasa→orqaga | uz/ru | 390 | Playwright | ⚠️ UI matnlari to'liq tarjima qilingan, LEKIN muassasa dastur/mutaxassislik teglari tarjima qilinmaydi (UX-004) | — |

---

## 3. Soddalashtirilgan asosiy yo'l (dalil asosida)

```
Bosh sahifa (maqsad kiritish/mashhur muassasalar)
        │
        ▼
Qidiruv YOKI "Menga mosini top" vizard (4 savol)
        │                              │
        ▼                              ▼
   Natijalar ro'yxati            % moslik + sabab bilan natija
        │                              │
        └──────────────┬───────────────┘
                        ▼
              Muassasa sahifasi (mehmon: narx/manzil ko'rinadi,
              telefon/Telegram/sharhlar yashirin)
                        │
              ┌─────────┼─────────┐
              ▼         ▼         ▼
         Solishtirish  Ro'yxatdan  Probnoy darsga
         (2-4 ta)      o'tish      yozilish
                        │
              Telegram yoki Google
              (SMS o'chiq; ikkalasi ham
               yuklanmasa — UX-002)
                        │
                        ▼
              To'liq kontakt/sharh/murojaat
```

---

## 4. Ustuvor topilmalar (qisqacha jadval)

| ID | Muammo | Ta'sir | Dalil | Ustuvorlik | Hajm |
|---|---|---|---|---|---|
| UX-001 | Solishtirish paneli (CompareBar) mobil pastki asosiy navigatsiyani to'liq yopadi | Har bir mobil foydalanuvchi, 1+ muassasa tanlaganda | Playwright: klik intercept + screenshot | **P1** | S |
| UX-002 | Auth sahifasida Telegram+Google ikkalasi ham yuklanmasa/muvaffaqiyatsiz bo'lsa, bo'sh quti chiqadi, xabar yo'q, SMS o'chiq | Kirish imkoni yo'qolgan yangi foydalanuvchi — konversiya to'liq to'sig'i | Kod: `auth/page.tsx:494,499` shartsiz konteyner render | **P1** | M |
| UX-003 | Qidiruvdan orqaga qaytganda scroll pozitsiyasi saqlanmaydi (filtr/sort esa URL orqali saqlanadi) | Ko'p natija ko'rgan foydalanuvchi har safar qayta scroll qiladi | Playwright: scrollY 601→13 | **P2** | S |
| UX-004 | `programs`/`specializations`/`shifts` faqat `String[]` — RU sahifada ham UZ tilida chiqadi | Har bir muassasa kartasi/sahifasi, rus tilidagi foydalanuvchi segmenti | Screenshot (RU sahifada UZ teglar) + schema.prisma:385-387 | **P2** | L (schema + migratsiya) |
| UX-005 | Telefon raqami formatlanmagan chiqadi (`+998781134444`) — loyihaning o'z qoidasi (`+998 (90) 123-45-67`) buzilgan | Har bir muassasa kontakt bloki | Kod: `InstitutionDetail.tsx:1052`, `formatPhone` funksiyasi umuman yo'q | **P2** | S |
| UX-006 | "BilimCoin bonus" toasti probnoy-bron va sharh formalari ustiga, hamda admin panelga chiqadi | Yangi ro'yxatdan o'tgan foydalanuvchi — aynan probnoy/sharh yozmoqchi bo'lgan paytda | Screenshot: forma input ustida toast | **P2** | S |
| UX-007 | B2B `/dashboard` hujjatda va'da qilingandek ishlamaydi — "tez orada" platsholder | Tasdiqlangan muassasa vakili (hamkor) | Real claim→approve API + login bilan tekshirildi | **P2** | XL (yangi funksiya) |
| UX-008 | 3 ta filtr `<select>` (viloyat/shahar/saralash) accessible name'ga ega emas | Ekran o'quvchi ishlatuvchi foydalanuvchilar (qamrov noma'lum, lekin WCAG kritik) | axe-core: `select-name`, critical | **P2** | S |
| UX-009 | Pastki tab-bar faol bo'lmagan matni (`text-gray-400`, 12px) WCAG 1.4.3 kontrastini qondirmaydi (~2.85:1, kerak 4.5:1) | Butun sayt, past ko'rish qobiliyatli foydalanuvchilar | axe-core: `color-contrast`, serious, har sahifada | **P2** | S |
| UX-010 | Bosh sahifada `<main>` landmark yo'q (`/search`da bor) | Ekran o'quvchi/klaviatura foydalanuvchilari | axe-core: `landmark-one-main` + kod tekshiruvi | **P3** | S |
| UX-011 | `/profile`dagi bo'sh-tavsiya matni "5 ta savol" deydi, aslida 4 ta | Yangi foydalanuvchi — kichik chalkashlik | Kod: `RecommendationDashboard.tsx:109` vs `match/page.tsx:222` | **P3** | S |

---

## 5. P0/P1 topilmalar — batafsil

### UX-001 — Solishtirish paneli mobil asosiy navigatsiyani yopib qo'yadi

- **Holat:** Tasdiqlangan (kod + Playwright orqali takrorlandi)
- **Joy:** `apps/web/src/components/compare/CompareBar.tsx:97` (mobil, barcha sahifalar, `/compare`dan tashqari) — [kod](https://github.com/FarrukhGulomov/edubaho/blob/a1d4b506071d74f7a1eac5248c0849d0f7415aab/apps/web/src/components/compare/CompareBar.tsx#L95-L99); taqqoslash uchun: `apps/web/src/components/shared/Header.tsx` pastki tab-bar ham `fixed bottom-0 ... z-50`
- **Dalil:** `/search`da 2 ta muassasani "Solishtir" tugmasi bilan tanlagach, Playwright pastki navigatsiyadagi `<a href="/compare">`ni bosishga urindi — Chromium xato berdi: *"`<button>Tozalash</button>` from `<div class="no-print">` subtree intercepts pointer events"*. Screenshot (`04-compare-match/viewport-overlap-bottom.png`): pastki qatorda faqat CompareBar ko'rinadi — "Asosiy/Qidirish/Solishtir/Kirish" tab-bar butunlay ko'rinmaydi.
  - Kutilgan: foydalanuvchi istalgan vaqt pastki tab-bar orqali boshqa bo'limga o'ta oladi.
  - Haqiqiy: CompareBar ochiq turganda pastki tab-bar bosilmaydi (va vizual ham ko'rinmaydi).
- **Ta'sir:** Solishtirish — mahsulotning asosiy reklama qilingan xususiyatlaridan biri (`/compare` alohida sahifa, TAHLIL.md'da ham alohida tilga olingan). Kamida 1 ta muassasa tanlagan HAR BIR mobil foydalanuvchi, tozalamaguncha yoki solishtirishni yakunlamaguncha, asosiy navigatsiyadan mahrum bo'ladi. CompareBar'ning o'zida "Solishtir" tugmasi bor (ishlaydi), shuning uchun vazifa umuman bajarilmay qolmaydi — lekin "Bosh sahifa"/"Kirish" kabi boshqa tab'larga o'tish vaqtincha imkonsiz.
- **Ustuvorlik:** P1 — keng qamrovli (har bir mobil sessiya), lekin to'liq blokировка emas (muqobil yo'l — CompareBar'ning o'z tugmasi — mavjud).
- **Yechim:** Ikki tugundan biri: (a) `Header.tsx`dagi pastki nav'ga CompareBar'dan yuqori z-index bering (masalan `z-[55]`) va CompareBar'ga pastki nav balandligicha (`bottom-[72px]` + safe-area) joy qoldiring — komponent ichida toast uchun aynan shu texnika allaqachon ishlatilgan (`CompareBar.tsx:71` — `bottom: calc(... + 92px)`); yoki (b) CompareBar'ni pastki nav yonida emas, undan yuqorida joylashtiring va nav bilan bitta umumiy konteyner orqali balandlikni hisoblang.
- **Qabul mezoni:** 2+ muassasa solishtirish uchun tanlangan holatda, mobil pastki tab-bardagi barcha 4 ta tugma (Asosiy/Qidirish/Solishtir/Kirish) to'liq ko'rinadi va bosiladi; regressiya: CompareBar o'zi ham (item chip'lari, "Solishtir" CTA) to'liq ko'rinishda qolishi kerak.

### UX-002 — Auth sahifasi: ikkala login usuli ham ishlamasa, foydalanuvchi hech narsa ko'rmaydi

- **Holat:** Koddan aniqlangan (tasdiqlangan mexanizm) + sandboxda vizual kuzatildi (aniqlik uchun quyida ajratilgan)
- **Joy:** `apps/web/src/app/auth/page.tsx:494-505` — [kod](https://github.com/FarrukhGulomov/edubaho/blob/a1d4b506071d74f7a1eac5248c0849d0f7415aab/apps/web/src/app/auth/page.tsx#L494-L505)
- **Dalil (kod):**
  ```tsx
  {BOT_USERNAME && (
    <div className="flex min-h-[52px] items-center justify-center ...">
      <div ref={tgRef} ... />   {/* Telegram skripti shu ichga iframe qo'yadi */}
    </div>
  )}
  {GOOGLE_CLIENT_ID && (
    <div className="flex min-h-[52px] items-center justify-center ...">
      <div ref={googleRef} ... />
    </div>
  )}
  ```
  Konteyner faqat env-o'zgaruvchi *mavjudligiga* qarab chiziladi — ichidagi skript (`telegram-widget.js` / Google GSI) muvaffaqiyatli yuklanib, tugma chizganiga hech qanday tekshiruv yo'q. Agar ikkala skript ham (tarmoq, ad-blocker, yoki BotFather domen mos kelmasligi — bu loyihada haqiqatan topilgan va commit `a1d4b50`da qisman tuzatilgan muammo edi) muvaffaqiyatsiz bo'lsa, ikkala `<div>` ham BO'SH qoladi.
  - **Mening sandbox muhitimda vizual tasdiq** (screenshot: `05-auth-mobile.png`): `NEXT_PUBLIC_GOOGLE_CLIENT_ID` bo'sh (lokal test .env) va `telegram.org` tarmoq siyosati bilan bloklangani sababli — "Bir bosishda kiring" bo'limi butunlay bo'sh oq quti. **Bu screenshot productionni emas, mening test muhitimni aks ettiradi** — productionda `NEXT_PUBLIC_GOOGLE_CLIENT_ID` o'rnatilgan (Railway'da o'zgaruvchi nomi mavjudligini tekshirdim, qiymatini o'qiy olmadim) va `telegram.org` normal ochiladi. Lekin **kod darajasidagi xato-yo'q-fallback muammosi** muhitdan qat'i nazar haqiqiy: agar ikkalasi ham (masalan foydalanuvchining ad-blocker'i Telegram/Google skriptlarini bloklasa, yoki BotFather domeni ustida bir muammo yana chiqsa) ishlamay qolsa, productionda ham xuddi shu bo'sh quti chiqadi.
  - SMS forma esa `PHONE_AUTH_ENABLED = false` bilan qat'iy o'chirilgan (`auth/page.tsx:20`) — muqobil yo'l yo'q.
- **Ta'sir:** Kam ehtimolli, lekin YUZ BERGANDA butun ro'yxatdan o'tish funnelini to'xtatadigan yagona nuqta (single point of failure). Qamrov: nechta foydalanuvchida bu holat yuzaga kelishi hozircha noma'lum (analytics yo'q — pastdagi o'lchash rejasiga qarang).
- **Ustuvorlik:** P1 (ehtimoli past, lekin ta'siri to'liq blokировка — real ko'rinishida topilgan bo'lsa P0 bo'lardi; hozircha faqat kod-darajasidagi risk sifatida tasdiqlangan).
- **Yechim:** (1) Telegram widget uchun `onload`/timeout orqali "iframe paydo bo'ldimi" tekshiruvi (kodda allaqachon `tgReady` state bor — `auth/page.tsx:187-194` — ayni shu holatni UI xabariga aylantirish kifoya); (2) agar N soniyadan keyin (masalan 5s) hech qanday usul tayyor bo'lmasa, "Kirish usuli yuklanmadi — sahifani yangilang yoki qo'llab-quvvatlash bilan bog'laning (@TrustboxInc)" ko'rinishidagi zaxira xabar/tugma ko'rsatish.
- **Qabul mezoni:** Telegram va Google skriptlarini qo'lda bloklab (DevTools'da domenni rad etib) sahifani ochganda, foydalanuvchi bo'sh quti o'rniga aniq xabar va kamida bitta muqobil harakat (masalan Telegram support havolasi) ko'radi.

---

## 6. Qolgan topilmalar (ixcham)

- **UX-003 (P2, S):** `/search?sortBy=value`dan muassasaga kirib "Orqaga" bosilsa, URL/filtr saqlanadi, lekin `window.scrollY` 601px'dan 13px'ga tushadi. Yechim: Next.js standart scroll-restoration ishlayotganini tekshirish (`router.push` chaqiruvida `scroll:false`/history API to'g'ri ishlatilganini ko'rish) yoki scroll pozitsiyasini `sessionStorage`da saqlab qo'lda tiklash.
- **UX-004 (P2, L):** `programs`/`specializations`/`shifts` (`schema.prisma:385-387`) faqat bitta til uchun. Bu — loyihaning o'z qoidasi (CLAUDE.md #2: "Barcha content fieldlar JUFT bo'ladi: nameUz/nameRu")ga zid. To'liq tuzatish schema migratsiyasi + admin forma + backfill talab qiladi (L/XL), shuning uchun keyingi sprint uchun tavsiya etiladi, tezkor tuzatish emas.
- **UX-005 (P2, S):** `formatPhone(phone)` kabi kichik utility (`apps/web/src/lib/phone.ts`, `formatUzs`ga o'xshash naqsh bilan) yaratib, `InstitutionDetail.tsx:1052` va `:711` (filial telefoni) da qo'llash kifoya.
- **UX-006 (P2, S):** `BonusIntroToast` komponenti probnoy-bron/sharh formalari ochilganda o'zini vaqtincha yashirsin (masalan shu formalar ochiq ekanini context orqali bilib, `visible=false` qilib qo'yish) yoki admin (`role !== 'USER'`) sahifalarida umuman render qilinmasin.
- **UX-007 (P2, XL):** Agar B2B panel hali tayyor bo'lmasa — bu **mahsulot qarori**, bug emas — lekin `DEV.md`dagi "4. Foydalanuvchi INSTITUTION_OWNER bo'ladi → `/dashboard` ochiladi" jumlasi hozirgi holatga mos yangilanishi kerak ("qo'lda tasdiqlashdan keyin ochiladi" deb).
- **UX-008 (P2, S):** `SearchResults.tsx`dagi `FilterSelect` komponentiga `ariaLabel` prop qo'shib, 3 ta chaqiruvga ("Viloyat", "Shahar", "Saralash") mos qiymat berish.
- **UX-009 (P2, S):** Pastki tab-bar va shunga o'xshash joylardagi `text-gray-400`ni faol bo'lmagan holat uchun `text-gray-500` yoki `text-gray-600`ga almashtirish (WCAG 1.4.3 — kamida 4.5:1).
- **UX-010 (P3, S):** `apps/web/src/app/page.tsx` (yoki `layout.tsx`) kontentini `<main>` bilan o'rash — `/search` sahifasidagi naqshga mos.
- **UX-011 (P3, S):** `RecommendationDashboard.tsx:109`dagi "5 ta savol" → "4 ta savol" (uz+ru).
- **Ijobiy kuzatuvlar (o'zgartirish shart emas, lekin qayd etishga arziydi):** bo'sh qidiruv holati (`Hech narsa topilmadi` + "Barcha muassasalar" CTA) va narx yo'q bo'lganda hech narsa ko'rsatilmasligi (`formatUzs` qoidasi) — TAHLIL.md'dagi eski tavsiyalar allaqachon amalga oshirilgan; EduFit natija sahifasi shaffof (% + sabab checklist'i) — ALGORITM.md'dagi "shaffof breakdown" va'dasiga mos.

---

## 7. Ustuvorlik va bosqichlar

**1-2 kunlik tezkor tuzatishlar (barchasi S hajmda, kod o'zgarishi minimal):**
UX-001 (CompareBar z-index/joy), UX-003 (scroll tiklash yoki hech bo'lmasa muammoni tasdiqlash), UX-005 (telefon format), UX-006 (toast'ni forma ustidan olib tashlash), UX-008 (select accessible name), UX-009 (kontrast), UX-010 (`<main>`), UX-011 ("5"→"4").

**Keyingi sprint:**
UX-002 (auth fallback UI + Telegram/Google yuklanish monitoring) — M/L hajm, chunki to'g'ri sinash uchun real muhitda (yoki tarmoq bloklash simulyatsiyasi bilan) tekshirish kerak; UX-007 uchun hujjatni yangilash (S) yoki B2B panelni haqiqatda qurish (XL, alohida loyiha).

**Keyinroq tekshiriladigan gipotezalar:**
UX-004 (i18n dasturlar/mutaxassisliklar) — to'g'ri yechim (schema+migratsiya+admin forma+backfill) katta, avval qancha muassasada RU tarjima haqiqatan kerak bo'lishini (RU-tilli trafik ulushi) analytics orqali tasdiqlash tavsiya etiladi.

### Bajaruvchi va qabul mezonlari (tezkor tuzatishlar)

| ID | Ijrochi rol | Qabul mezoni | Regressiya tekshiruvi |
|---|---|---|---|
| UX-001 | Frontend dasturchi | Compare 2+ item bilan mobil pastki nav to'liq bosiladi | `/search`, `/institutions/[slug]`, `/`da compare item bor/yo'q holatlarida pastki nav va CompareBar birga skrinshot |
| UX-005 | Frontend dasturchi | Har qanday `inst.phone`/`b.phone` `+998 (XX) XXX-XX-XX` ko'rinishida chiqadi | Turli formatdagi (bo'shliqli/bo'shliqsiz) DB qiymatlari bilan sinash |
| UX-006 | Frontend dasturchi | Toast probnoy-bron va sharh formasi ustiga chiqmaydi; admin sahifalarida umuman ko'rinmaydi | `/institutions/[slug]`da probnoy forma ochiq holatda + `/admin`da tekshirish |
| UX-008/009 | Frontend dasturchi | axe-core skanida `select-name` va shu aniq `color-contrast` topilmalari yo'qoladi | `/`, `/search`, `/compare`, `/match`, `/profile`da qayta axe skan |

---

## 8. O'lchash rejasi (analytics)

Hozirda `LeadEvent`/`track` tizimi mavjud (`auth_started/completed/abandoned`, `match_started/completed/result_click`, `gate_shown/gate_cta` allaqachon ishlatilmoqda — kodda tasdiqlandi). Quyidagilar **qo'shimcha** sifatida tavsiya etiladi, ayniqsa yuqoridagi topilmalarni o'lchash uchun:

| Event | Trigger | Asosiy parametrlar (shaxsiy ma'lumotsiz) | Surat/maxraj | Deduplikatsiya |
|---|---|---|---|---|
| `search_submitted` | Qidiruv so'rovi yoki filtr o'zgarishi yuborilganda | `query_len_bucket`, `city_id`, `type_filter`, `sort_by`, `has_query` | — | debounce: 500ms ichida bir nechta o'zgarish = 1 event |
| `zero_results` | Qidiruv natijasi 0 bo'lganda | `query_len_bucket`, `active_filters_count` | `zero_results / search_submitted` | sessiya+so'rov bo'yicha 1 marta |
| `institution_viewed` | `/institutions/[slug]` yuklanganda | `institution_id`, `source` (search/match/city_topic/direct), `is_guest` | — | sessiya ichida sahifa yangilanmaguncha 1 marta |
| `compare_used` | `/compare`da 2+ item bilan sahifa ko'rilganda | `items_count` | `compare_used / institution_viewed` (bosqich sifatida) | — |
| `compare_nav_blocked` *(yangi, UX-001 uchun)* | CompareBar ochiq holatda pastki nav klik urinishi (agar frontendda aniqlash mumkin bo'lsa) yoki oddiyroq: CompareBar ko'rsatilgan vaqt ichida boshqa nav'ga o'tish soni | `time_visible_ms` | — | — |
| `lead_started` | Murojaat/probnoy formasi ochilganda (submit emas) | `institution_id`, `form_type` (contact/trial) | `lead_started / institution_viewed` | — |
| `lead_submitted` | **Faqat backend 2xx tasdiqlagandan keyin** (frontend tugma bosilishi emas) | `institution_id`, `form_type` | `lead_submitted / lead_started` | so'rov ID bo'yicha — ikki marta bosish bitta yozuv bersin |
| `trial_booked` | Probnoy-dars bron **backend tomonidan tasdiqlangach** | `institution_id` | `trial_booked / lead_started(trial)` | xuddi shu |
| `auth_dead_end` *(yangi, UX-002 uchun)* | `/auth`da 5s ichida Telegram ham, Google ham render bo'lmasa | `tg_configured`, `google_configured` | — | sessiyada 1 marta |

**Muhim eslatma:** `lead_submitted` va `trial_booked` hech qachon tugma bosilishi bilan tenglashtirilmasin — faqat backend muvaffaqiyatli javobidan keyin yozilsin (aks holda tarmoq xatosida ham "muvaffaqiyat" hisoblanib, noto'g'ri konversiya ko'rsatkichi chiqadi).

Hozircha bu loyihada haqiqiy foydalanuvchi so'rovnomasi yoki A/B natijasi mavjud emas (auditda ko'rilmadi). **Tavsiya etilgan qisqa usability-test rejasi** (5-6 respondent, 30 daqiqa har biriga): (1) "Farzandingiz uchun IELTS kursi toping va 2 tasini solishtiring" vazifasi — UX-001ni real foydalanuvchida tasdiqlaydi; (2) "Telegram/Google hisobingiz bo'lmasa, ro'yxatdan qanday o'tasiz?" savoli — UX-002ning haqiqiy ta'sirini baholaydi; (3) rus tilida so'zlashuvchi respondent bilan qidiruv — UX-004ning haqiqiy og'irligini ko'rsatadi.

---

## 9. Tekshirilmagan qismlar va ochiq noaniqliklar

- **Telegram Login Widget va Google tugmasining haqiqiy render bo'lishi** — sandbox tarmoq siyosati `telegram.org`/`accounts.google.com`ni bloklaydi, lokal `.env`da Google Client ID bo'sh. Faqat kod audit qilindi (UX-002).
- **Real SMS OTP yuborilishi** — `PHONE_AUTH_ENABLED=false` bo'lgani uchun UI orqali sinalmadi (audit qoidasiga ko'ra kodni o'zgartirib yoqilmadi); backend OTP mexanizmi to'g'ridan-to'g'ri API orqali (real SMSsiz, dev-otp bilan) sinaldi va ishladi.
- **`/admin/reviews`, `/admin/super/*`, Referral admin oqimlari** — vaqt cheklovi tufayli chuqur tekshirilmadi, faqat admin panel bosh sahifasidan kirish nuqtalari ko'rildi.
- **768px planshet kengligi** — faqat bosh sahifada tekshirildi; boshqa sahifalarda maxsus muammo taxmin qilinmaydi (390/1440'da overflow topilmagani hisobga olinsa past xavf), lekin tasdiqlanmagan.
- **Production'dagi haqiqiy ma'lumot** (masalan haqiqiy muassasa soni, RU tarjima holati, qaysi domen — `bilimon.uz`/`www.bilimon.uz` — Telegram BotFather'da ro'yxatdan o'tgani) — bu audit **faqat kod va lokal seed ma'lumoti** asosida qilindi. Production deploy holati (aynan qaysi commit ishlab turgani) tasdiqlanmadi.
- **`b.phone` (filial telefoni)** UX-005'da faqat kod orqali topildi, ekranda ko'rsatib tasdiqlanmadi (audit vaqti tugagani sababli) — past xavfli, chunki bir xil kod naqshi (`{b.phone}`, formatlashsiz).
- Ushbu auditning barcha sonli xulosalari (masalan "har bir mobil foydalanuvchi") **taxminiy** — haqiqiy foydalanuvchi xulq-atvori bo'yicha analytics ma'lumoti ko'rilmadi, chunki bunday dashboard audit doirasida taqdim etilmagan.
