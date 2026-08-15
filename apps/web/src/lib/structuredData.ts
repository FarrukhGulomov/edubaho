/**
 * Schema.org JSON-LD generatorlari — Google qidiruv natijalarida
 * ⭐ reyting va breadcrumb kabi "rich result"larni ko'rsatish uchun.
 * https://developers.google.com/search/docs/appearance/structured-data
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bilimon.uz'

interface InstitutionForSchema {
  nameUz: string
  slug: string
  type: string
  phone?: string
  website?: string
  telegram?: string
  instagram?: string
  address?: string
  avgRating?: number
  reviewCount: number
  city?: { nameUz: string } | null
  details?: { descriptionUz?: string }
}

/**
 * Muassasa uchun EducationalOrganization + LocalBusiness (ikkalasi ham —
 * Google local-business rich result'lari uchun) + AggregateRating (agar
 * sharh mavjud bo'lsa — qidiruvda ⭐ yulduzcha ko'rsatiladi).
 */
export function institutionSchema(inst: InstitutionForSchema) {
  const url = `${SITE_URL}/institutions/${inst.slug}`
  const sameAs = [
    inst.website,
    inst.telegram ? `https://t.me/${inst.telegram.replace('@', '')}` : undefined,
    inst.instagram ? `https://instagram.com/${inst.instagram.replace('@', '')}` : undefined,
  ].filter(Boolean)

  return {
    '@context': 'https://schema.org',
    '@type': ['EducationalOrganization', 'LocalBusiness'],
    name: inst.nameUz,
    url,
    ...(inst.details?.descriptionUz ? { description: inst.details.descriptionUz.slice(0, 300) } : {}),
    ...(inst.phone ? { telephone: inst.phone } : {}),
    ...(inst.address ? {
      address: {
        '@type': 'PostalAddress',
        streetAddress: inst.address,
        ...(inst.city?.nameUz ? { addressLocality: inst.city.nameUz } : {}),
        addressCountry: 'UZ',
      },
    } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    ...(inst.avgRating && inst.reviewCount > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: inst.avgRating,
        reviewCount: inst.reviewCount,
        bestRating: 5,
        worstRating: 1,
      },
    } : {}),
  }
}

/** Breadcrumb — qidiruv natijalarida "Bosh sahifa > ..." yo'lini ko'rsatadi */
export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

/** Ro'yxat sahifalari (shahar×mavzu) uchun — Google'ga bu to'plam ekanini bildiradi */
export function itemListSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      url: item.url,
    })),
  }
}
