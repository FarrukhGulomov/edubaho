import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { env } from '../utils/env'

/**
 * Cloudflare R2 — S3-mos API orqali muassasa rasmlarini saqlash.
 * R2_* o'zgaruvchilari sozlanmagan bo'lsa (mahalliy dev/demo muhit)
 * `isStorageConfigured()` false qaytaradi — chaqiruvchi kod (media
 * route'lari) shunda foydalanuvchiga tushunarli xato ko'rsatadi,
 * server ishga tushishda yiqilmaydi.
 */
export function isStorageConfigured(): boolean {
  return !!(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY && env.R2_SECRET_KEY)
}

/**
 * R2_ACCOUNT_ID sifatida to'liq endpoint URL kiritish odatiy xato —
 * Cloudflare buni "S3 API" qatorida to'liq `https://<id>.r2.cloudflarestorage.com`
 * shaklida ko'rsatadi va ID'ni ajratib olish oson unutiladi. Bunday holatda
 * `https://${accountId}.r2.cloudflarestorage.com` shablonida ikkilangan
 * protokol/domen hosil bo'lib, DNS xatosiga olib kelardi
 * (masalan `getaddrinfo ENOTFOUND <bucket>.https`) — shuning uchun
 * qo'shilib qolgan protokol/domen qismlarini tozalab tashlaymiz.
 */
function normalizeAccountId(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\.r2\.cloudflarestorage\.com\/?$/, '')
}

let cachedClient: S3Client | null = null

function getClient(): S3Client {
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: 'auto',
      endpoint: `https://${normalizeAccountId(env.R2_ACCOUNT_ID)}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY,
        secretAccessKey: env.R2_SECRET_KEY,
      },
    })
  }
  return cachedClient
}

/**
 * Rasmni R2'ga yuklaydi va ommaviy URL'ini qaytaradi.
 * @param key — bucket ichidagi yo'l (masalan "institutions/<id>/<uuid>.webp")
 */
export async function uploadImage(
  buffer: Buffer,
  key: string,
  contentType: string,
): Promise<string> {
  const client = getClient()
  await client.send(new PutObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    // Statik media uzoq muddat keshlanadi — yangilansa kalit (fayl nomi) o'zgaradi
    CacheControl: 'public, max-age=31536000, immutable',
  }))
  return `${env.R2_PUBLIC_URL}/${key}`
}

/** URL'dan emas, saqlangan `key`dan o'chiradi — shuning uchun media route uni alohida saqlaydi */
export async function deleteImage(key: string): Promise<void> {
  const client = getClient()
  await client.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET, Key: key }))
}

/** Ommaviy URL'dan bucket ichidagi kalitni ajratib oladi (o'chirishda kerak) */
export function keyFromPublicUrl(url: string): string | null {
  if (!url.startsWith(env.R2_PUBLIC_URL)) return null
  return url.slice(env.R2_PUBLIC_URL.length).replace(/^\//, '')
}
