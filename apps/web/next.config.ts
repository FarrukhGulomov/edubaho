import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
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
