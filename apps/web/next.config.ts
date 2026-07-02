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
}

export default nextConfig
