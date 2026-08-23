/**
 * O'quvchilar sonini aniq raqam sifatida emas, oraliq (range) sifatida
 * ko'rsatish uchun — bu son markaz tomonidan o'zi taqdim etiladi va
 * Bilimon tomonidan tasdiqlanmagan (davlat reestridan tekshirib bo'lmaydi).
 * Aniq "15 000+" kabi raqam ishonchni yolg'ondan oshiradi; oraliq esa
 * haqiqiy noaniqlikni to'g'ri aks ettiradi.
 */
const STUDENT_BUCKETS: Array<[min: number, max: number | null]> = [
  [0, 50],
  [50, 100],
  [100, 250],
  [250, 500],
  [500, 1_000],
  [1_000, 3_000],
  [3_000, null],
]

function withSpaces(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export function formatStudentRange(count: number): string {
  if (count <= 0) return '0'
  for (const [min, max] of STUDENT_BUCKETS) {
    if (max === null) return `${withSpaces(min)}+`
    if (count <= max) return `${withSpaces(min)}–${withSpaces(max)}`
  }
  return `${withSpaces(count)}+`
}
