# EduReyting — Dev Quick Reference

## Servislarni ishga tushirish

```bash
# 1. Docker (PostgreSQL + Redis + Meilisearch)
docker-compose up -d

# 2. API server  (terminal 1)
cd apps/api && npm run dev

# 3. Frontend    (terminal 2)
cd apps/web && npm run dev
```

---

## URLlar

| Xizmat         | URL                                  |
|----------------|--------------------------------------|
| **Frontend**   | http://localhost:3000                |
| **API**        | http://localhost:3001/api/v1         |
| **API Health** | http://localhost:3001/health         |
| **Meilisearch**| http://localhost:7700                |
| **DB**         | postgresql://localhost:5433/edureyting |

---

## OTP olish (development)

SMS **YUBORILMAYDI** — OTP terminalda chiqadi yoki API'dan olinadi:

**1-usul — API endpoint:**
```
GET http://localhost:3001/api/v1/auth/dev-otp/+998XXXXXXXXX
```
Misol:
```bash
curl http://localhost:3001/api/v1/auth/dev-otp/+998909775255
# → {"phone":"+998909775255","otp":"123456"}
```

**2-usul — API terminal logidan:**
```
📱 OTP [+998909775255]: 123456
```

---

## Google (Gmail) orqali kirish — sozlash

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) da OAuth Client ID yarating (Web application)
2. Authorized JavaScript origins: `http://localhost:3000` (prod'da domen)
3. Env o'zgaruvchilar:
   - API (`apps/api/.env`): `GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com`
   - Web (`apps/web/.env.local`): `NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com`
4. Ikkalasi bir xil Client ID bo'lishi shart. O'rnatilmagan bo'lsa Google tugmasi ko'rinmaydi.

---

## Hamkor (muassasa egasi) oqimi

1. Vakil istalgan usulda kiradi (telefon/Telegram/Gmail)
2. Muassasa sahifasida «Bu muassasa siznikimi?» → so'rov yuboradi
3. Admin tasdiqlaydi: `POST /api/v1/admin/claims/:id/approve` (yoki panel orqali)
4. Foydalanuvchi INSTITUTION_OWNER bo'ladi → `/dashboard` ochiladi

---

## Admin panelga kirish

**URL:** http://localhost:3000/admin/login

**Jarayon:**
1. Telefon raqam kiriting (o'z raqamingiz, avval `/auth` da ro'yxatdan o'tgan bo'lsin)
2. OTP → terminaldan yoki `dev-otp` endpoint'dan oling
3. **Admin PIN:** `147258`

**Shartlar:**
- Foydalanuvchi DB'da `role = 'ADMIN'` yoki `'SUPER_ADMIN'` bo'lishi kerak
- Super admin tayinlash uchun avval DB'da qo'lda o'zgartirish:

```sql
UPDATE "User" SET role = 'SUPER_ADMIN' WHERE phone = '+998909775255';
```

---

## Super Admin sahifalari

| Sahifa                  | URL                                         |
|-------------------------|---------------------------------------------|
| Admin panel bosh        | http://localhost:3000/admin                 |
| Sharhlar moderatsiya    | http://localhost:3000/admin/reviews         |
| Muassasalar             | http://localhost:3000/admin/institutions    |
| Super Admin bosh        | http://localhost:3000/admin/super           |
| Adminlarni boshqarish   | http://localhost:3000/admin/super/admins    |
| Foydalanuvchilar        | http://localhost:3000/admin/super/users     |
| **Lead Analytics**      | http://localhost:3000/admin/super/analytics |

---

## DB ulanish

```
Host:     localhost:5433
DB:       edureyting
User:     edureyting_user
Password: edureyting_secret
```

Prisma Studio:
```bash
cd apps/api && npx prisma studio
# → http://localhost:5555
```

---

## Foydali buyruqlar

```bash
# Migration yaratish
cd apps/api && npx prisma migrate dev --name nom

# DB seed
cd apps/api && npm run db:seed

# API loglarini ko'rish (agar background'da)
tail -f /tmp/api.log

# Docker servislarini tekshirish
docker ps

# Docker to'xtatish
docker-compose down
```

---

## Test API so'rovlari

```bash
# OTP yuborish
curl -X POST http://localhost:3001/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+998901234567"}'

# OTP olish (dev)
curl http://localhost:3001/api/v1/auth/dev-otp/+998901234567

# OTP tasdiqlash
curl -X POST http://localhost:3001/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+998901234567","otp":"XXXX"}'

# Token bilan so'rov
curl http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer TOKEN_HERE"

# Analytics event yuborish (test)
curl -X POST http://localhost:3001/api/v1/track \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test-123","event":"page_view","category":"page"}'
```
