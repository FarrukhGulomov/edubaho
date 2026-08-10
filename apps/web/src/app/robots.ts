import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://edula.uz'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Admin panel, autentifikatsiya va profil sahifalari qidiruv natijalarida kerak emas
        disallow: ['/admin', '/auth', '/profile', '/dashboard'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
