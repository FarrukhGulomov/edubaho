/**
 * Kirill → Lotin transliteratsiya yordamchi funksiyalari.
 * Foydalanuvchi "математика" yozsa "matematika" ga o'giriladi
 * va lotin yozuvida saqlangan O'zbek ma'lumotlaridan natija topiladi.
 */

const CYRILLIC_TO_LATIN: Record<string, string> = {
  'а': 'a',  'б': 'b',  'в': 'v',  'г': 'g',  'д': 'd',
  'е': 'e',  'ё': 'yo', 'ж': 'zh', 'з': 'z',  'и': 'i',
  'й': 'y',  'к': 'k',  'л': 'l',  'м': 'm',  'н': 'n',
  'о': 'o',  'п': 'p',  'р': 'r',  'с': 's',  'т': 't',
  'у': 'u',  'ф': 'f',  'х': 'x',  'ц': 'ts', 'ч': 'ch',
  'ш': 'sh', 'щ': 'sh', 'ъ': '',   'ы': 'i',  'ь': '',
  'э': 'e',  'ю': 'yu', 'я': 'ya',
  'А': 'A',  'Б': 'B',  'В': 'V',  'Г': 'G',  'Д': 'D',
  'Е': 'E',  'Ё': 'Yo', 'Ж': 'Zh', 'З': 'Z',  'И': 'I',
  'Й': 'Y',  'К': 'K',  'Л': 'L',  'М': 'M',  'Н': 'N',
  'О': 'O',  'П': 'P',  'Р': 'R',  'С': 'S',  'Т': 'T',
  'У': 'U',  'Ф': 'F',  'Х': 'X',  'Ц': 'Ts', 'Ч': 'Ch',
  'Ш': 'Sh', 'Щ': 'Sh', 'Ъ': '',   'Ы': 'I',  'Ь': '',
  'Э': 'E',  'Ю': 'Yu', 'Я': 'Ya',
  // O'zbek kirill harflari
  'ғ': 'g',  'қ': 'q',  'ң': 'ng', 'ў': 'u',  'ҳ': 'h',
  'Ғ': 'G',  'Қ': 'Q',  'Ң': 'Ng', 'Ў': 'U',  'Ҳ': 'H',
}

/** Matndagi Kirill harflarini lotinga o'giradi */
export function transliterateCyrillic(text: string): string {
  return text.split('').map(ch => CYRILLIC_TO_LATIN[ch] ?? ch).join('')
}

/** Matn Kirill harflarini o'z ichiga oladimi */
export function hasCyrillic(text: string): boolean {
  return /[а-яёА-ЯЁғқңўҳҒҚҢЎҲ]/u.test(text)
}

/**
 * Qidiruv so'rovini normallashtiradi:
 * - Kirill bo'lsa → lotin transliteratsiyasini qaytaradi
 * - Lotin bo'lsa → o'zini qaytaradi
 * Ikkalasi ham kerak bo'lsa { original, latin } qaytaradi
 */
export function normalizeQuery(q: string): { original: string; latin: string; hasCyrillic: boolean } {
  const trimmed = q.trim()
  const cyrillicFound = hasCyrillic(trimmed)
  const latin = cyrillicFound ? transliterateCyrillic(trimmed) : trimmed
  return { original: trimmed, latin, hasCyrillic: cyrillicFound }
}
