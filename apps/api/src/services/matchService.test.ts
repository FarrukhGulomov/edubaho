import { describe, it, expect } from 'vitest'
import {
  computeMatchScore, evaluateGoal, resolveMatchedLocation,
  effectiveMonthlyPrice, DEFAULT_MIN_MATCH_SCORE, type MatchCandidate, type MatchPreferences,
} from './matchService'

/** Minimal, to'liq MatchCandidate — testda faqat kerakli maydonlar override qilinadi */
function makeCandidate(overrides: Partial<MatchCandidate> = {}): MatchCandidate {
  return {
    id: 'inst-1',
    nameUz: 'Test Markaz',
    nameRu: null,
    slug: 'test-markaz',
    type: 'COURSE_CENTER',
    status: 'ACTIVE',
    isVerified: false,
    avgRating: null,
    reviewCount: 0,
    cityId: 'city-tashkent',
    regionId: 'region-tashkent',
    branches: [],
    phone: null,
    deliveryMode: 'OFFLINE',
    details: null,
    pricing: null,
    mediaCount: 0,
    ...overrides,
  }
}

const basePrefs: MatchPreferences = { type: 'COURSE_CENTER' }

describe('WEIGHTS — og\'irliklar yig\'indisi', () => {
  it('bitta muassasa uchun barcha komponentlar og\'irligi 1.0 ga teng', () => {
    const inst = makeCandidate()
    const { components } = computeMatchScore(inst, basePrefs, 4.0)
    const totalWeight = components.reduce((sum, c) => sum + c.weight, 0)
    expect(totalWeight).toBeCloseTo(1.0, 5)
  })
})

describe('resolveMatchedLocation — filial vs asosiy manzil', () => {
  it('onlayn markaz uchun joylashuvdan qat\'i nazar "online" qaytaradi', () => {
    const inst = makeCandidate({ deliveryMode: 'ONLINE', cityId: null, regionId: null })
    const loc = resolveMatchedLocation(inst, { ...basePrefs, cityId: 'city-buxoro' })
    expect(loc.kind).toBe('online')
  })

  it('muassasaning ASOSIY shahri so\'ralgan shahar bilan mos kelsa "institution" qaytaradi', () => {
    const inst = makeCandidate({ cityId: 'city-buxoro' })
    const loc = resolveMatchedLocation(inst, { ...basePrefs, cityId: 'city-buxoro' })
    expect(loc).toEqual({ kind: 'institution', via: 'city' })
  })

  it('asosiy manzil mos kelmasa-yu, FILIALI mos kelsa — filial ma\'lumoti bilan "branch" qaytaradi (UX audit topilmasi)', () => {
    const inst = makeCandidate({
      cityId: 'city-tashkent',
      branches: [{
        id: 'branch-1', nameUz: 'Buxoro filiali', nameRu: null, address: 'Bahovuddin ko\'chasi',
        cityId: 'city-buxoro', regionId: 'region-buxoro',
        city: { nameUz: 'Buxoro', nameRu: 'Бухара' },
      }],
    })
    const loc = resolveMatchedLocation(inst, { ...basePrefs, cityId: 'city-buxoro' })
    expect(loc.kind).toBe('branch')
    expect(loc.via).toBe('city')
    expect(loc.branch?.id).toBe('branch-1')
    expect(loc.branch?.city.nameUz).toBe('Buxoro')
  })

  it('na asosiy manzil, na filiallar mos kelmasa — "none" qaytaradi', () => {
    const inst = makeCandidate({ cityId: 'city-tashkent', branches: [] })
    const loc = resolveMatchedLocation(inst, { ...basePrefs, cityId: 'city-buxoro' })
    expect(loc).toEqual({ kind: 'none', via: null })
  })

  it('viloyat darajasida ham filial orqali mos kelishi mumkin', () => {
    const inst = makeCandidate({
      cityId: 'city-tashkent', regionId: 'region-tashkent',
      branches: [{
        id: 'branch-1', nameUz: null, nameRu: null, address: null,
        cityId: 'city-other', regionId: 'region-buxoro',
        city: { nameUz: 'Kogon', nameRu: null },
      }],
    })
    const loc = resolveMatchedLocation(inst, { ...basePrefs, regionId: 'region-buxoro' })
    expect(loc.kind).toBe('branch')
    expect(loc.via).toBe('region')
  })
})

describe('scoreLocation (computeMatchScore ichida) — filial mosligi to\'g\'ri ballanadi', () => {
  it('faqat filial orqali mos kelgan muassasa ham to\'liq (100) joylashuv balli oladi', () => {
    const instBranchMatch = makeCandidate({
      cityId: 'city-tashkent',
      branches: [{
        id: 'branch-1', nameUz: null, nameRu: null, address: null,
        cityId: 'city-buxoro', regionId: 'region-buxoro',
        city: { nameUz: 'Buxoro', nameRu: null },
      }],
    })
    const { components } = computeMatchScore(instBranchMatch, { ...basePrefs, cityId: 'city-buxoro' }, 4.0)
    const location = components.find((c) => c.key === 'location')
    expect(location?.score).toBe(100)
    expect(location?.reasonUz).toContain('Filiali')
  })

  it('mos kelmagan shahar uchun past ball (25) qaytaradi', () => {
    const inst = makeCandidate({ cityId: 'city-tashkent', regionId: 'region-tashkent' })
    const { components } = computeMatchScore(inst, { ...basePrefs, cityId: 'city-buxoro' }, 4.0)
    const location = components.find((c) => c.key === 'location')
    expect(location?.score).toBe(25)
  })
})

describe('scoreBudget — byudjet qattiq mezon (P0-3)', () => {
  it('foydalanuvchi byudjet kiritgan, lekin narx ma\'lumoti yo\'q bo\'lsa — past ball (15), neytral (55) EMAS', () => {
    const inst = makeCandidate({ pricing: null })
    const { components } = computeMatchScore(inst, { ...basePrefs, budget: 500_000 }, 4.0)
    const budget = components.find((c) => c.key === 'budget')
    expect(budget?.score).toBe(15)
    expect(budget?.hasData).toBe(false)
  })

  it('byudjet kiritilmagan bo\'lsa — neytral (60) ball, jarima yo\'q', () => {
    const inst = makeCandidate({ pricing: null })
    const { components } = computeMatchScore(inst, basePrefs, 4.0)
    const budget = components.find((c) => c.key === 'budget')
    expect(budget?.score).toBe(60)
  })

  it('narx byudjet ichida bo\'lsa — to\'liq ball (100)', () => {
    const inst = makeCandidate({ pricing: { monthlyMin: 300_000, monthlyMax: 400_000 } })
    const { components } = computeMatchScore(inst, { ...basePrefs, budget: 500_000 }, 4.0)
    const budget = components.find((c) => c.key === 'budget')
    expect(budget?.score).toBe(100)
  })

  it('faqat yillik narx kiritilgan bo\'lsa ham (universitet/kollej) oylik ekvivalenti hisobga olinadi', () => {
    expect(effectiveMonthlyPrice({ monthlyMin: null, monthlyMax: null, yearlyMin: 12_000_000 })).toBe(1_000_000)
  })
})

describe('evaluateGoal — qattiq yo\'nalish filtri', () => {
  it('bo\'sh maqsad — har doim mos (filtr ishlamaydi)', () => {
    const inst = makeCandidate()
    expect(evaluateGoal(inst, '').matched).toBe(true)
  })

  it('dastur/mutaxassislik nomida aniq mos kelsa — "course" turi bilan mos', () => {
    const inst = makeCandidate({ details: {
      descriptionUz: null, minAge: null, maxAge: null, languages: [],
      programs: ['IELTS Advanced'], shifts: [], specializations: [], categories: [],
    } })
    const ev = evaluateGoal(inst, 'IELTS')
    expect(ev.matched).toBe(true)
    expect(ev.matchType).toBe('course')
    expect(ev.matchedProgram).toBe('IELTS Advanced')
  })

  it('mos kelmasa — qattiq chetlab o\'tiladi', () => {
    const inst = makeCandidate({ details: {
      descriptionUz: null, minAge: null, maxAge: null, languages: [],
      programs: ['Frontend dasturlash'], shifts: [], specializations: [], categories: [],
    } })
    const ev = evaluateGoal(inst, 'IELTS')
    expect(ev.matched).toBe(false)
  })

  it('toifa (categories maydoni) orqali ham mos kelishi mumkin', () => {
    const inst = makeCandidate({ details: {
      descriptionUz: null, minAge: null, maxAge: null, languages: [],
      programs: [], shifts: [], specializations: [], categories: ['IELTS'],
    } })
    const ev = evaluateGoal(inst, 'IELTS kursi')
    expect(ev.matched).toBe(true)
    expect(ev.matchType).toBe('category')
  })
})

describe('scoreLocation — onlayn markaz neytralligi', () => {
  it('onlayn markaz shahar so\'ralganda ham jazolanmaydi (yuqori ball)', () => {
    const inst = makeCandidate({ deliveryMode: 'ONLINE', cityId: null, regionId: null })
    const { components } = computeMatchScore(inst, { ...basePrefs, cityId: 'city-buxoro' }, 4.0)
    const location = components.find((c) => c.key === 'location')
    expect(location?.score).toBe(95)
    expect(location?.hasData).toBe(true)
  })
})

describe('DEFAULT_MIN_MATCH_SCORE — toifa mosligi + boshqa mezonlar "Farqi yo\'q" holatida ham natija chiqishi kerak', () => {
  it('faqat toifa (category) orqali mos kelgan, to\'liq tasdiqlangan muassasa ham chegaradan o\'tadi (UX audit topilmasi: "SAT" bo\'yicha 0 natija)', () => {
    // Foydalanuvchi shahar/format/byudjetni "Farqi yo'q" qoldirgan —
    // real hayotda juda keng tarqalgan holat. Avval bu holatda chegara
    // (75) DEYARLI hech qachon yetib bo'lmas edi: toifa mosligi (90)
    // + qolgan barcha komponentlar neytral bo'lsa ham yakuniy ball
    // ~73 dan oshmasdi, hatto ENG yaxshi (tasdiqlangan, to'liq profilli)
    // muassasa uchun ham — natijada haqiqiy, sifatli mosliklar "0 ta
    // natija" sifatida ko'rsatilardi.
    const inst = makeCandidate({
      isVerified: true, phone: '+998901234567', mediaCount: 2,
      pricing: { monthlyMin: 500_000, monthlyMax: null },
      details: {
        descriptionUz: 'SAT tayyorlov kursi', minAge: null, maxAge: null,
        languages: [], programs: [], shifts: [], specializations: [], categories: ['SAT'],
      },
    })
    const { score } = computeMatchScore(inst, { ...basePrefs, goal: 'SAT' }, 4.2)
    expect(score).toBeGreaterThanOrEqual(DEFAULT_MIN_MATCH_SCORE)
  })
})
