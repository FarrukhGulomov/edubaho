import { env } from '../utils/env'
import { formatPhone } from '../utils/phone'

/**
 * Google Places orqali "Admin Import Yordamchisi" — yangi muassasa
 * qo'shishda admin qidiruv qilib, natijani forma maydonlariga
 * (nom/manzil/koordinata/telefon) qo'lda ko'chirib olishi uchun.
 *
 * MUHIM (Google Maps Platform shartlari): bu ma'lumotni doimiy saqlab,
 * o'z katalogimizni avtomatik to'ldirish TAQIQLANGAN. Shuning uchun bu
 * xizmat DB'ga hech narsa yozmaydi — faqat jonli so'rov natijasini
 * qaytaradi, admin tanlab "Import qilish" bosgandagina forma
 * maydonlariga ko'chiriladi va admin o'zi tahrirlab saqlaydi.
 */

export interface PlaceSearchResult {
  placeId: string
  name: string
  address: string
  lat: number | null
  lng: number | null
  rating: number | null
  userRatingsTotal: number | null
}

export interface PlaceDetails extends PlaceSearchResult {
  phone: string | null
  website: string | null
}

export function isPlacesImportConfigured(): boolean {
  return !!env.GOOGLE_PLACES_API_KEY
}

interface TextSearchResponse {
  status: string
  error_message?: string
  results?: Array<{
    place_id: string
    name: string
    formatted_address?: string
    geometry?: { location?: { lat: number; lng: number } }
    rating?: number
    user_ratings_total?: number
  }>
}

interface PlaceDetailsResponse {
  status: string
  error_message?: string
  result?: {
    name: string
    formatted_address?: string
    geometry?: { location?: { lat: number; lng: number } }
    formatted_phone_number?: string
    international_phone_number?: string
    website?: string
    rating?: number
    user_ratings_total?: number
  }
}

/**
 * Muassasa nomi/manzili bo'yicha qidirish (Text Search).
 * O'zbekiston bo'yicha natijalarga moyillik beriladi — aks holda
 * boshqa mamlakatdagi bir xil nomli joylar aralashib ketishi mumkin.
 */
export async function searchPlaces(query: string): Promise<PlaceSearchResult[]> {
  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json')
  url.searchParams.set('query', `${query} O'zbekiston`)
  url.searchParams.set('region', 'uz')
  url.searchParams.set('language', 'uz')
  url.searchParams.set('key', env.GOOGLE_PLACES_API_KEY)

  const res = await fetch(url)
  const data = (await res.json()) as TextSearchResponse

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`${data.status}${data.error_message ? ': ' + data.error_message : ''}`)
  }

  return (data.results ?? []).slice(0, 8).map((r) => ({
    placeId: r.place_id,
    name: r.name,
    address: r.formatted_address ?? '',
    lat: r.geometry?.location?.lat ?? null,
    lng: r.geometry?.location?.lng ?? null,
    rating: r.rating ?? null,
    userRatingsTotal: r.user_ratings_total ?? null,
  }))
}

/**
 * Tanlangan joy uchun to'liq ma'lumot (telefon/veb-sayt Text Search'da
 * kelmaydi — shuning uchun faqat admin aniq joyni tanlaganda, alohida
 * so'rov bilan olinadi, har bir harf bosilganda emas).
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
  url.searchParams.set('place_id', placeId)
  url.searchParams.set(
    'fields',
    'name,formatted_address,geometry,formatted_phone_number,international_phone_number,website,rating,user_ratings_total',
  )
  url.searchParams.set('language', 'uz')
  url.searchParams.set('key', env.GOOGLE_PLACES_API_KEY)

  const res = await fetch(url)
  const data = (await res.json()) as PlaceDetailsResponse

  if (data.status !== 'OK' || !data.result) {
    throw new Error(`${data.status}${data.error_message ? ': ' + data.error_message : ''}`)
  }

  const r = data.result
  const rawPhone = r.international_phone_number ?? r.formatted_phone_number ?? null

  return {
    placeId,
    name: r.name,
    address: r.formatted_address ?? '',
    lat: r.geometry?.location?.lat ?? null,
    lng: r.geometry?.location?.lng ?? null,
    rating: r.rating ?? null,
    userRatingsTotal: r.user_ratings_total ?? null,
    // Loyihaning standart formatiga o'giramiz: +998 (90) 123-45-67
    // (O'zbekiston raqami bo'lmasa — Google qaytargan holicha qoldiriladi)
    phone: rawPhone ? formatPhone(rawPhone) : null,
    website: r.website ?? null,
  }
}
