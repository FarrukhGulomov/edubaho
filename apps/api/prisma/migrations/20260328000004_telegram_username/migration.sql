-- Telegram username ni saqlash (lidlar uchun)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "telegramUsername" TEXT;
CREATE INDEX IF NOT EXISTS "User_telegramUsername_idx" ON "User"("telegramUsername");
