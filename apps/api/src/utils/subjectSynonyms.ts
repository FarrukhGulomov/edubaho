/**
 * Predmet sinonimlari bazasi.
 *
 * Muammo: foydalanuvchi "химия" (ruscha), "kimyo" (o'zbekcha lotin),
 * "кимё" (o'zbekcha kirill) yoki "chemistry" (inglizcha) deb qidiradi —
 * barchasi bir xil predmetni bildiradi, lekin ma'lumotlar bazasida
 * "Kimyo" sifatida saqlanadi.
 *
 * Yechim: har bir predmet uchun barcha mumkin bo'lgan yozish variantlarini
 * guruhlarga jamlaymiz. Qidiruv vaqtida guruh topilsa, barcha variantlar
 * bilan qidiramiz.
 *
 * Guruh a'zolari (lowercase):
 *   - O'zbek lotincha (DB dagi canonical shakl)
 *   - O'zbek kirillcha
 *   - Ruscha kirillcha
 *   - Inglizcha
 *   - Qisqartmalar va xato yozuvlar
 */

const SUBJECT_GROUPS: string[][] = [
  // ── Kimyo ─────────────────────────────────────────────────────────────────
  ['kimyo', 'кимё', 'химия', 'ximiya', 'chemistry', 'chem', 'хим', 'kim'],

  // ── Matematika ─────────────────────────────────────────────────────────────
  ['matematika', 'математика', 'math', 'maths', 'mathematics', 'матем', 'matem'],

  // ── Algebra ───────────────────────────────────────────────────────────────
  ['algebra', 'алгебра', 'algeb'],

  // ── Geometriya ────────────────────────────────────────────────────────────
  ['geometriya', 'геометрия', 'geometry', 'геом', 'geom'],

  // ── Fizika ────────────────────────────────────────────────────────────────
  ['fizika', 'физика', 'physics', 'phys', 'физ', 'fiz'],

  // ── Biologiya ─────────────────────────────────────────────────────────────
  ['biologiya', 'биология', 'biology', 'bio', 'биол'],

  // ── Ingliz tili ───────────────────────────────────────────────────────────
  [
    'ingliz', 'ingliz tili', 'inglizcha', 'english', 'инглиз', 'английский',
    'anglicha', 'english language', 'inglizca', 'inglisch',
  ],

  // ── Rus tili ──────────────────────────────────────────────────────────────
  ['rus', 'rus tili', 'ruscha', 'russian', 'рус', 'русский', 'russkiy', 'русский язык'],

  // ── O'zbek tili ───────────────────────────────────────────────────────────
  ['uzbek', "o'zbek", 'ўзбек', 'узбек', 'uzb', "o'zbek tili", 'uzbek tili', 'ona tili'],

  // ── Tarix ─────────────────────────────────────────────────────────────────
  ['tarix', 'история', 'history', 'тарих', 'hist', 'tarixi'],

  // ── Geografiya ────────────────────────────────────────────────────────────
  ['geografiya', 'география', 'geography', 'geo', 'геогр'],

  // ── Informatika / IT ──────────────────────────────────────────────────────
  [
    'informatika', 'информатика', 'it', 'dasturlash', 'programming',
    'coding', 'kompyuter', 'computer', 'it texnologiyalari', 'программирование',
  ],

  // ── Adabiyot ──────────────────────────────────────────────────────────────
  ['adabiyot', 'литература', 'literature', 'адабиёт', 'adab'],

  // ── Musiqa ────────────────────────────────────────────────────────────────
  ['musiqa', 'музыка', 'music', 'муз', 'muz'],

  // ── Tasviriy san'at / Rasm ────────────────────────────────────────────────
  ["tasviriy san'at", 'rasm', 'art', 'drawing', 'рисование', 'изо', 'san\'at', 'tasviriy'],

  // ── Jismoniy tarbiya / Sport ──────────────────────────────────────────────
  ['jismoniy', 'jismoniy tarbiya', 'sport', 'физкультура', 'pe', 'physical education', 'физ'],

  // ── Astronomiya ───────────────────────────────────────────────────────────
  ['astronomiya', 'астрономия', 'astronomy', 'астр'],

  // ── Iqtisodiyot ───────────────────────────────────────────────────────────
  ['iqtisodiyot', 'iqtisod', 'экономика', 'economics', 'ekonomika'],

  // ── Huquq ─────────────────────────────────────────────────────────────────
  ['huquq', 'право', 'law', 'yuridik', 'yuridika', 'pravo'],

  // ── Psixologiya ───────────────────────────────────────────────────────────
  ['psixologiya', 'психология', 'psychology', 'psych'],

  // ── Robototexnika ─────────────────────────────────────────────────────────
  ['robototexnika', 'робототехника', 'robotics', 'robot', 'robotics'],

  // ── Xorij tillari / Chet tili ─────────────────────────────────────────────
  ['chet tili', 'xorij tili', 'foreign', 'иностранный', 'иностранный язык'],

  // ── Nemis tili ────────────────────────────────────────────────────────────
  ['nemis', 'nemis tili', 'немецкий', 'german', 'deutsch'],

  // ── Fransuz tili ──────────────────────────────────────────────────────────
  ['fransuz', 'fransuz tili', 'французский', 'french', 'français'],

  // ── Xitoy tili ────────────────────────────────────────────────────────────
  ['xitoy', 'xitoy tili', 'китайский', 'chinese', 'mandarin'],

  // ── Koreys tili ───────────────────────────────────────────────────────────
  ['koreys', 'koreys tili', 'корейский', 'korean'],

  // ── Arab tili ─────────────────────────────────────────────────────────────
  ['arab', 'arab tili', 'арабский', 'arabic'],

  // ── Texnologiya ───────────────────────────────────────────────────────────
  ['texnologiya', 'технология', 'technology', 'tex'],

  // ── Mantiq ────────────────────────────────────────────────────────────────
  ['mantiq', 'логика', 'logic'],

  // ── Tabiatshunoslik ───────────────────────────────────────────────────────
  ['tabiatshunoslik', 'естествознание', 'natural science', 'tabiat'],

  // ── IELTS / Xalqaro imtihonlar ────────────────────────────────────────────
  ['ielts', 'toefl', 'cefr', 'sat', 'act', 'gre', 'gmat', 'duolingo'],

  // ── Maktabgacha ta'lim ────────────────────────────────────────────────────
  ['maktabgacha', 'дошкольное', 'preschool', 'kindergarten', "bog'cha", "bog'cha tayyorlov"],

  // ── Olimpiada ─────────────────────────────────────────────────────────────
  ['olimpiada', 'олимпиада', 'olympiad', 'olimpiad'],

  // ── Ona tili / O'zbek adabiyoti ────────────────────────────────────────────
  ['ona tili', 'o\'zbek adabiyoti', 'uzbek adabiyoti'],

  // ── Kimyo-Biologiya (birikma) ─────────────────────────────────────────────
  ['kimyo-biologiya', 'химия-биология', 'chemistry-biology', 'ximiya-biologiya'],

  // ── Fizika-Matematika (birikma) ────────────────────────────────────────────
  ['fizika-matematika', 'физика-математика', 'physics-math', 'fizmat', 'физмат'],

  // ── Dizayn ────────────────────────────────────────────────────────────────
  ['dizayn', 'дизайн', 'design', 'grafik dizayn', 'web dizayn'],

  // ── Arxitektura ───────────────────────────────────────────────────────────
  ['arxitektura', 'архитектура', 'architecture'],

  // ── Tibbiyot / Meditsina ──────────────────────────────────────────────────
  ['tibbiyot', 'meditsina', 'медицина', 'medicine', 'medical'],

  // ── Muhandislik ───────────────────────────────────────────────────────────
  ['muhandislik', 'инженерия', 'engineering', 'engineer'],

  // ── Moliya / Finance ──────────────────────────────────────────────────────
  ['moliya', 'финансы', 'finance', 'buxgalteriya', 'бухгалтерия', 'accounting'],

  // ── Tadbirkorlik / Business ────────────────────────────────────────────────
  ['tadbirkorlik', 'бизнес', 'business', 'biznes', 'entrepreneurship'],

  // ── Raqamli savodxonlik ───────────────────────────────────────────────────
  ['raqamli', 'digital', 'raqamli savodxonlik', 'digital literacy'],
]

// ─── Lookup map: lowercase term → all terms in its group ─────────────────────
const LOOKUP = new Map<string, string[]>()
for (const group of SUBJECT_GROUPS) {
  for (const term of group) {
    LOOKUP.set(term.toLowerCase(), group)
  }
}

/**
 * Qidiruv so'rovi uchun barcha sinonim variantlarini qaytaradi.
 *
 * Misol: expandSearchTerms("химия")
 * → ["химия", "кимё", "kimyo", "ximiya", "chemistry", "chem", "хим", "kim"]
 *
 * Agar sinonim topilmasa — [originalQuery] qaytariladi.
 */
export function expandSearchTerms(q: string): string[] {
  const lower = q.toLowerCase().trim()

  // To'liq moslik
  if (LOOKUP.has(lower)) return dedup([q, ...LOOKUP.get(lower)!])

  // Qisman moslik: foydalanuvchi qisman yozgan bo'lishi mumkin (masalan "matematik")
  for (const [term, group] of LOOKUP) {
    if (term.startsWith(lower) || lower.startsWith(term)) {
      return dedup([q, ...group])
    }
  }

  return [q]
}

/** Takrorlanmasdan, kichik harflarni saqlagan holda massiv qaytaradi */
function dedup(terms: string[]): string[] {
  const seen = new Set<string>()
  return terms.filter(t => {
    const k = t.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/**
 * Meilisearch uchun sinonimlar ob'ekti.
 * setupSearchIndex() da index.updateSynonyms() ga beriladi.
 *
 * Format: { "term": ["synonym1", "synonym2"] }
 * Meilisearch ikki tomonlama sinonim uchun har bir yo'nalishni alohida qo'shadi.
 */
export function getMeilisearchSynonyms(): Record<string, string[]> {
  const synonyms: Record<string, string[]> = {}
  for (const group of SUBJECT_GROUPS) {
    for (const term of group) {
      // Bu termdan boshqa barcha a'zolar sinonim hisoblanadi
      const others = group.filter(t => t !== term)
      if (others.length > 0) synonyms[term] = others
    }
  }
  return synonyms
}
