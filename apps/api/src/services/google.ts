import { env } from '../utils/env'

/**
 * Google Identity Services (GIS) ID tokenini tekshirish.
 *
 * Frontend'dan kelgan credential (JWT) Google'ning rasmiy tokeninfo
 * endpoint'i orqali tekshiriladi — imzo, muddat va audience Google
 * tomonida validatsiya qilinadi.
 * https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
 */
export interface GoogleUser {
  googleId: string
  email: string
  name: string
  avatarUrl?: string
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleUser | null> {
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  )
  if (!res.ok) return null

  const payload = (await res.json()) as Record<string, string | undefined>

  // Token aynan bizning ilova uchun berilganini tekshirish
  if (payload.aud !== env.GOOGLE_CLIENT_ID) return null

  // Issuer faqat Google bo'lishi kerak
  if (payload.iss !== 'https://accounts.google.com' && payload.iss !== 'accounts.google.com') {
    return null
  }

  // Faqat tasdiqlangan email qabul qilinadi
  if (payload.email_verified !== 'true' || !payload.email || !payload.sub) return null

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name ?? payload.email.split('@')[0] ?? payload.email,
    avatarUrl: payload.picture,
  }
}
