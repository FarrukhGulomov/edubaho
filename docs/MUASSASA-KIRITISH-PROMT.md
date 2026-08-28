# Muassasa ma'lumotlarini BilimOn uchun tayyorlash

Har bir o'quv markazni internetdan qidirib, ma'lumotini qo'lda BilimOn
maydonlariga moslash va uz/ru qilish ko'p vaqt oladi. Bu hujjat shu ishni
tezlashtiradi.

**Eng tez yo'l — 3 qadam:**

1. **Faktlar** (nom, manzil, telefon, sayt, koordinata) → admin paneldagi
   **"Import Yordamchisi"** (Google Places) orqali avtomatik olinadi.
2. **Tavsif, yo'nalishlar, uz/ru matn** → quyidagi promtni istalgan AI'ga
   (Claude/ChatGPT) beriladi.
3. Natija admin formaga ko'chiriladi va **saqlanadi**.

---

## 1-qism: Promt (nusxa olib ishlating)

Quyidagi matnni to'liq nusxa oling, oxiriga xom ma'lumotni qo'shing:

```
Sen BilimOn (bilimon.uz) — O'zbekistondagi ta'lim muassasalari platformasi
uchun ma'lumot tayyorlaysan.

MEN BERAMAN: bitta o'quv muassasasi haqidagi xom ma'lumot — veb-sayt matni,
Instagram/Telegram bio, Google Maps tavsifi yoki shunchaki "nom + shahar".

SEN QAYTARASAN: pastdagi shaklda to'ldirilgan maydonlar.

═══════════════════════════════════════════
ENG MUHIM QOIDA — HECH NARSA O'YLAB TOPMA
═══════════════════════════════════════════
Bu ma'lumotlar ommaviy saytga chiqadi va ota-onalar shunga qarab qaror
qiladi. Shuning uchun:

- Manbada YO'Q ma'lumotni YOZMA. Bo'sh qoldirib "— topilmadi" deb belgila.
- Narx, o'quvchilar soni, o'qituvchilar soni, tashkil topgan yil — faqat
  manbada ANIQ yozilgan bo'lsa. Taxmin qilma, "odatda shuncha bo'ladi"
  dema.
- "Eng yaxshi", "O'zbekistonda №1", "10 yillik tajriba" kabi iboralarni
  faqat manbada bo'lsa va bu muassasaning O'Z da'vosi ekanini bildirib yoz.
- Ishonchsiz narsani oxiridagi "TEKSHIRISH KERAK" ro'yxatiga chiqar.

═══════════════════════════════════════════
FORMAT QOIDALARI
═══════════════════════════════════════════
- Narx: 1 500 000 so'm  (bo'shliq bilan, "so'm" qo'shimchasi bilan)
  ❌ 1,500,000 UZS  ❌ $120
- Telefon: +998 (90) 123-45-67
- Slug: faqat kichik lotin harflari, raqam va tire (masalan: najot-talim)
- Har bir matn maydoni JUFT: o'zbekcha (lotin) + ruscha
- Ruscha matn — tabiiy rus tili, so'zma-so'z tarjima emas

═══════════════════════════════════════════
MAYDONLAR VA RUXSAT ETILGAN QIYMATLAR
═══════════════════════════════════════════

TUR (bittasini tanla, aynan shu kodlardan):
  IT_SCHOOL (IT maktab) | UNIVERSITY (Universitet) | SCHOOL (Maktab)
  KINDERGARTEN (Bog'cha) | LANGUAGE_CENTER (Til markazi)
  COURSE_CENTER (O'quv markaz) | SPORTS_SCHOOL (Sport maktabi)
  LYCEUM (Litsey) | COLLEGE (Kollej) | TUTORING (Repetitor)
  ARTS_SCHOOL (San'at maktabi)

QO'SHIMCHA TURLAR (ixtiyoriy, bir nechta — yuqoridagi ro'yxatdan):
  Muassasa asosiy turdan tashqari boshqa yo'nalishda ham ishlasa.

O'QISH FORMATI (bittasi):
  OFFLINE | ONLINE | HYBRID

TA'LIM YO'NALISHLARI (kategoriyalar — bir nechta tanlanadi):
  ⚠️ Bu eng muhim maydon — "Menga mos markazni top" algoritmida QATTIQ
  filtr. Noto'g'ri belgilansa, muassasa noto'g'ri odamlarga tavsiya
  qilinadi. Faqat manbada ANIQ tasdiqlangan yo'nalishlarni belgila.

  UNIVERSITY_PREP ............ OTMga kirish tayyorlov
  IELTS ...................... IELTS
  SAT ........................ SAT
  CEFR ....................... CEFR / TOEFL
  SCHOOL_SUBJECTS ............ Maktab fanlari
  IT_COURSES ................. IT kurslari
  PROGRAMMING ................ Dasturlash
  DESIGN ..................... Dizayn
  MARKETING .................. Marketing
  ACCOUNTING ................. Buxgalteriya
  LANGUAGES .................. Chet tillari
  KIDS_EDUCATION ............. Bolalar ta'limi
  PROFESSIONAL_CERTIFICATION . Kasbiy sertifikatlash

O'QITISH TILLARI (bir nechta): uz | ru | en | de | fr | ko | zh

SMENALAR (bir nechta, aynan shu matnlar):
  Ertalabki (08:00-13:00) | Tushki (13:00-18:00) | Kechki (18:00-22:00)
  Hafta oxiri | Online

TO'LOV USULLARI (bir nechta, faqat shular):
  Payme | Click | Uzcard | Humo | Naqd
  ❌ Stripe, PayPal, Visa/Mastercard — O'zbekistonda ishlatilmaydi

═══════════════════════════════════════════
JAVOB SHAKLI (aynan shu tartibda qaytar)
═══════════════════════════════════════════

--- ASOSIY ---
Nomi (O'zbek):
Nomi (Rus):
Slug:
Tur:
Qo'shimcha turlar:
O'qish formati:

--- ALOQA ---
Telefon:
Qo'shimcha telefon:
Email:
Veb-sayt:
Telegram:
Instagram:
Shahar:
Manzil:

--- BATAFSIL ---
Tavsif (O'zbek):      [2-4 gap, faqat faktlar, reklama tili emas]
Tavsif (Rus):
Tashkil topgan yil:
O'quvchilar soni:
O'qituvchilar soni:
O'qitish tillari:
Smenalar:
Dasturlar:           [vergul bilan: "IELTS, General English, Kids English"]
Mutaxassisliklar:    [vergul bilan]
Ta'lim yo'nalishlari: [yuqoridagi kodlardan]
Yutuqlar:            [faqat manbada bo'lsa]

--- NARX ---
Oylik narx (min):
Oylik narx (max):
To'lov usullari:

--- TEKSHIRISH KERAK ---
[Manbada topilmagan yoki ishonchsiz maydonlar ro'yxati — men keyin
 qo'ng'iroq qilib aniqlashtiraman]

═══════════════════════════════════════════
XOM MA'LUMOT:
═══════════════════════════════════════════
[SHU YERGA SAYT/INSTAGRAM/GOOGLE MAPS MATNINI QO'YING]
```

---

## 2-qism: Ish tartibi (tavsiya)

1. **Admin → Muassasa qo'shish → "Import Yordamchisi"** da muassasa nomini
   qidiring. Google Places nom, manzil, telefon, veb-sayt va koordinatani
   beradi — bularni o'ylab topish shart emas, ular tasdiqlangan faktlar.
2. Muassasa saytini/Instagramini oching, **matnni to'liq nusxa oling**
   (Ctrl+A → Ctrl+C bo'lsa ham bo'ladi, ortiqcha matn AI'ga xalaqit bermaydi).
3. Yuqoridagi promtni AI'ga bering, oxiriga o'sha matnni qo'ying.
4. Javobni admin formaga ko'chiring.
5. **"TEKSHIRISH KERAK"** ro'yxatidagi maydonlarni bo'sh qoldiring — keyin
   muassasaga qo'ng'iroq qilganda to'ldiriladi. Bo'sh maydon — noto'g'ri
   ma'lumotdan yaxshi.

### Nega narxni o'ylab topmaslik muhim

Narx BilimOn'da qidiruv filtri va moslik algoritmida ishlatiladi. Xato narx
— foydalanuvchi byudjetiga mos kelmagan markazni ko'radi, borib xafa bo'ladi,
platformaga ishonch yo'qoladi. Narx noma'lum bo'lsa bo'sh qoldirilgani
ma'qul: muassasa sahifasida "narx ko'rsatilmagan" deb chiqadi, bu halol.

---

## 3-qism: Ko'p muassasani birdan kiritish

Hozircha har bir muassasa formadan alohida kiritiladi. Agar bir vaqtda
10-20 tasini kiritish kerak bo'lsa, mavjud **JSON import** funksiyasini
(`/admin/super` → Import) shunga moslash mumkin — hozir u faqat zaxiradan
tiklash uchun ishlaydi (ichki `id`, `cityId` talab qiladi). Uni shahar
NOMI bo'yicha ishlaydigan qilib kengaytirsa, AI tayyorlagan JSON'ni
to'g'ridan-to'g'ri yuklab, 20 ta muassasani bir marta qo'shish mumkin
bo'ladi.
