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
        hostname: 'media.edureyting.uz',
      },
      {
        // Development uchun
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  serverExternalPackages: [],
}

export default nextConfig
