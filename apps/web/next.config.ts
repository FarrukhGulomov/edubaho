import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  output: 'standalone',
  // Monorepo root'ni ko'rsatamiz — standalone ichida apps/web/server.js paydo bo'ladi
  outputFileTracingRoot: path.join(__dirname, '../../'),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'media.bilimon.uz',
      },
      {
        protocol: 'https',
        hostname: 'media.edureyting.uz',
      },
      {
        protocol: 'https',
        hostname: 'media.edubaho.uz',
      },
      {
        // Cloudflare R2 default public domenlari
        protocol: 'https',
        hostname: '**.r2.dev',
      },
      {
        // Development uchun
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  serverExternalPackages: [],

  // www.bilimon.uz -> bilimon.uz: butun loyihada (metadata, sitemap, robots,
  // SITE_URL) yagona domen sifatida bilimon.uz (www'siz) ishlatiladi, lekin
  // Railway'da ikkala domen ham (www bilan va bo'lmagan) saytga ulangan va
  // ular orasida hech qanday redirect yo'q edi. Bu ayniqsa Telegram Login
  // Widget uchun MUHIM: BotFather orqali botga faqat BITTA aniq domen
  // bog'lanadi (/setdomain), va widget shu domen bilan ANIQ mos kelmasa
  // ishlamaydi — foydalanuvchi www bilan kirsa, "bot domain ishlamayapti"
  // holati aynan shundan kelib chiqishi mumkin edi.
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.bilimon.uz' }],
        destination: 'https://bilimon.uz/:path*',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
