-- phone ustunini nullable qilish (mavjud ma'lumotlar o'zgarmaydi, faqat NOT NULL cheklovi olib tashlanadi)
ALTER TABLE "User" ALTER COLUMN "phone" DROP NOT NULL;

-- Telegram ID ustunini qo'shish
ALTER TABLE "User" ADD COLUMN "telegramId" TEXT;
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");
CREATE INDEX "User_telegramId_idx" ON "User"("telegramId");
