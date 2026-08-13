import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BilimOn — ta\'lim muassasalarini toping',
    short_name: 'BilimOn',
    description: "O'zbekistondagi maktablar, universitetlar, kurslar va bog'chalarni qidiring, solishtiring va baholang.",
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0369a1',
    icons: [
      { src: '/brand/bilimon-app-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/brand/bilimon-app-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/brand/bilimon-app-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/brand/bilimon-app-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
