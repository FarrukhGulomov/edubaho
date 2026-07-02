# EduFit — EDUBAHO tavsiya algoritmi

*Moslik dvigateli: "Qaysi markaz yaxshi?" emas — "Shu foydalanuvchiga qaysi biri mos?"*

---

## 1. ChatGPT taklifi (LSE/SCFA) tahlili

ChatGPT taklif qilgan "Learning Success Engine" **yo'nalish sifatida to'g'ri, lekin
hozirgi bosqichda amalga oshirib bo'lmaydi**. Ochiq baholash:

### To'g'ri g'oyalar (saqlab qolamiz)

| G'oya | Nega to'g'ri |
|---|---|
| Umumiy reyting o'rniga shaxsiy moslik | Har bir foydalanuvchi uchun boshqa natija — bu haqiqiy differensiator |
| Natijaga yo'naltirilgan tavsiya | "89% ehtimol" katalogdan qimmatroq qiymat |
| Ko'p o'lchovli baholash | Narx+reyting+masofa yetarli emas — jadval, yosh, maqsad ham muhim |
| Ishonchlilik ko'rsatkichi | Halollik — ma'lumot kam bo'lsa buni yashirmaslik |

### Jiddiy muammolar

1. **Ma'lumot yo'q (eng katta muammo).** Formuladagi 12 komponentdan 9 tasi bizda
   umuman mavjud bo'lmagan ma'lumotni talab qiladi: o'quvchilarning boshlang'ich/yakuniy
   IELTS ballari, davomat, bitirish foizi, ish topish foizi, maosh o'sishi, o'qituvchi
   kesimidagi natijalar. Bu ma'lumotlarni yig'ish uchun markazlar CRM'larini ochishi yoki
   o'quvchilar natijalarini o'zi kiritishi kerak — ikkalasi ham yillar davomidagi ish.
   **"100 ming o'quvchi vektori" bugungi 0 ta natija-yozuvidan chiqmaydi.**

2. **Matematik xatolik.** Taklifda avval 11 komponent **ko'paytiriladi**
   (`A × B × C × ...`), keyin esa **og'irlikli yig'indi** beriladi (`0.20×A + 0.15×B...`).
   Bu ikkalasi bir-biriga zid. Ko'paytirishda bitta 0 ball hammasini 0 qiladi va
   100 ballik 11 komponent ko'paytmasi 100 dan oshib ketadi. To'g'risi — og'irlikli
   yig'indi (biz shuni ishlatamiz).

3. **Soxta aniqlik xavfi.** Ma'lumot yo'q joyda "94% ishonchli", "muvaffaqiyat 78%"
   deb ko'rsatish foydalanuvchini aldash. Bir marta noto'g'ri "95% mos" ko'rgan
   foydalanuvchi platformaga qaytmaydi. **Ehtimol** so'zini faqat haqiqiy natija
   ma'lumotlari paydo bo'lgandan keyin ishlatish mumkin.

4. **Manipulyatsiya (gaming).** Completion rate, davomat, natija ballarini markazlar
   o'zi kiritsa — hamma 100% kiritadi. Har bir signal uchun "buni kim tasdiqlaydi?"
   savoli javobsiz qolgan.

5. **Cold start.** Yangi qo'shilgan markaz hech qanday tarixiy ma'lumotga ega emas —
   LSE bo'yicha u doim oxirgi o'rinda. Bu yangi markazlarni platformaga kelishdan
   qaytaradi (ikki tomonlama marketplace uchun o'lim).

**Xulosa:** LSE — bu 3-bosqich vizyoni, 1-kun algoritmi emas. Uni bosqichlarga
bo'lib, har bosqichda faqat **mavjud va tekshiriladigan** ma'lumot bilan ishlaydigan
qilib qurdik.

---

## 2. EduFit — 3 bosqichli strategiya

### Bosqich 1 — Moslik balli (HOZIR ISHLAYDI, shu PR'da) ✅

Deterministik, shaffof, ML'siz. Foydalanuvchi 5 savolga javob beradi
(tur → maqsad → shahar → byudjet → vaqt/yosh), har bir muassasa uchun 0–100
moslik hisoblanadi:

```
Moslik = 0.25·Maqsad + 0.25·Sifat + 0.15·Byudjet + 0.15·Joylashuv
       + 0.10·Jadval + 0.05·Yosh + 0.05·Ishonch
```

| Komponent | Manba | Himoya |
|---|---|---|
| **Maqsad** | programs/specializations/tavsif bo'yicha token-moslik, sinonim bazasi bilan («химия»→«kimyo»→«chemistry») | Faqat matn mosligi, va'da emas |
| **Sifat** | Bayesian silliqlangan reyting: `(C·m + R·n)/(C+n)`, C=10 | 2 ta sharhli 5.0 ★ 200 ta sharhli 4.6 ★ dan yuqori chiqmaydi |
| **Byudjet** | monthlyMin vs byudjet; oshsa har +10% uchun −20 ball | Narx yashirilgan bo'lsa neytral + confidence pasayadi |
| **Joylashuv** | Shahar=100, viloyat=70, boshqa=25 | Qattiq filtr emas — kichik shaharlar bo'sh qolmaydi |
| **Jadval** | shifts matni bilan kalit so'z mosligi | Ma'lumot yo'q → neytral |
| **Yosh** | minAge/maxAge oralig'i, ±2 yosh bufer | — |
| **Ishonch** | verified + profil to'liqligi | Markazlarni profilni to'ldirishga rag'batlantiradi (B2B flywheel!) |

**Asosiy tamoyillar:**
- **Shaffoflik**: har bir ball sabab bilan qaytadi — foydalanuvchi «Nega bu tavsiya?»
  tugmasini bosib to'liq breakdown ko'radi. Bu ishonch quradi va bizni
  «qora quti» tavsiyalardan ajratadi.
- **Halol ishonchlilik**: ma'lumotga ega komponentlarning og'irlik ulushi =
  confidence %. Ma'lumot kam muassasa jarima olmaydi, lekin foydalanuvchi
  "bu baho taxminiy" ekanini ko'radi.
- **Muvaffaqiyat "ehtimoli" va'da qilinmaydi** — chunki hali natija ma'lumoti yo'q.

### Bosqich 2 — Natija ma'lumotlari flywheel'i (3–9 oy)

Maqsad: LSE'ga kerak bo'lgan ma'lumotni **tekshiriladigan** usulda yig'ish:

1. **Lid tracking allaqachon bor** (`LeadEvent`) — `contact_click` dan keyin
   foydalanuvchidan 30 kundan so'ng so'raymiz: «Yozildingizmi?» (Telegram bot push).
2. **Bitiruvchi so'rovi**: kurs tugagach «Natijangiz?» (IELTS balli, ish topdi/yo'q).
   Rag'bat: «Tasdiqlangan bitiruvchi» nishoni + sharh yozish imkoniyati.
3. **Markaz tomonidan kiritilgan natijalar** faqat hujjat bilan (sertifikat skan)
   qabul qilinadi va «tasdiqlangan natija» sifatida alohida ko'rsatiladi.
4. Shu ma'lumotlar bilan yangi komponentlar qo'shiladi:
   `CompletionRate`, `ExamSuccess` — lekin faqat n≥20 yozuv bo'lgan markazlar uchun
   (kam ma'lumotda ko'rsatilmaydi, jarima ham berilmaydi).

### Bosqich 3 — O'xshash o'quvchilar (12+ oy, ML)

`LeadEvent` + Bosqich 2 natijalari yetarli hajmga yetgach (~10 000 faol foydalanuvchi):

- **Collaborative filtering**: «sizga o'xshagan (maqsad, yosh, shahar, byudjet)
  foydalanuvchilar qaysi markazlarni tanladi va natijasi qanday bo'ldi».
- **Dropout-risk**: jadval nomuvofiqligi + masofa signallaridan logistic regression.
- Shundan keyingina «6 oyda IELTS 7 ehtimoli: 78%» kabi bashoratlar — chunki endi
  ular haqiqiy tarixiy taqsimotdan hisoblanadi.
- ChatGPT'ning «Digital Twin» g'oyasi shu bosqichda profil anketasi sifatida kiradi.

---

## 3. Nega bu yondashuv noyob (raqobat ustunligi)

1. **Shaffof breakdown** — O'zbekiston bozorida hech bir katalog «nega bu tavsiya»
   ni komponentlarga bo'lib ko'rsatmaydi. Yandex/Google xaritalari ham.
2. **Ishonchlilik halolligi** — «95% mos (ishonchlilik 40%)» deyish qisqa muddatda
   kamtarona, uzoq muddatda esa ishonch = retention.
3. **B2B flywheel**: Ishonch komponenti profil to'liqligiga bog'liq → markazlar
   ma'lumot kiritishga rag'batlanadi → moslik aniqroq bo'ladi → foydalanuvchi ko'payadi
   → markazlar uchun qiymat oshadi.
4. **Ma'lumot xandaqi (moat)**: wizard har bir sessiyada strukturalangan talab
   ma'lumotini yig'adi (`match_completed` eventi: tur+maqsad+byudjet+shahar).
   6 oydan keyin bizda O'zbekiston ta'lim talabining eng katta strukturalangan
   xaritasi bo'ladi — buni hech kim nusxalay olmaydi.

## 4. Texnik joylashuv

| Qatlam | Fayl |
|---|---|
| Ball dvigateli (pure funksiyalar) | `apps/api/src/services/matchService.ts` |
| API | `POST /api/v1/match` (`apps/api/src/routes/match.ts`) — public, 30 req/min |
| Wizard UI | `apps/web/src/app/match/page.tsx` |
| Analytics | `match_started`, `match_completed`, `match_result_click` eventlari |
| Kirish nuqtasi | Bosh sahifa hero'sidagi «🎯 Qaysi biri menga mos?» CTA |

Og'irliklarni o'zgartirish uchun `matchService.ts` dagi `WEIGHTS` konstantasi —
A/B test qilish oson (og'irliklar so'rov parametri sifatida ham berilishi mumkin).
