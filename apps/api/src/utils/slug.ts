/**
 * O'zbek va rus matnidan URL-slug yaratish.
 * Kirill → Lotin transliteratsiyasi qo'shilgan.
 */
const CYRILLIC_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo',
  ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
  ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  // O'zbek harflari
  ў: 'u', қ: 'q', ғ: 'g', ҳ: 'h',
}

function transliterate(text: string): string {
  return text
    .toLowerCase()
    .split('')
    .map((char) => CYRILLIC_MAP[char] ?? char)
    .join('')
}

export function generateSlug(text: string, suffix?: string): string {
  const base = transliterate(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // diakritik belgilarni olib tashlash
    .replace(/[^a-z0-9\s-]/g, '')    // faqat harf, raqam, bo'shliq, chiziq
    .trim()
    .replace(/\s+/g, '-')             // bo'shliqlarni chiziqqa almashtirish
    .replace(/-+/g, '-')              // ikki chiziqni bittaga
    .slice(0, 80)                     // maksimal uzunlik

  return suffix ? `${base}-${suffix}` : base
}

/**
 * Slug'ni unikal qilish uchun random suffix qo'shish
 */
export function generateUniqueSlug(text: string): string {
  const suffix = Math.random().toString(36).slice(2, 6)
  return generateSlug(text, suffix)
}
