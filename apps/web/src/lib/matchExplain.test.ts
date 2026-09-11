import { describe, it, expect } from 'vitest'
import { explanationLabel, pickCaveat } from './matchExplain'
import type { MatchComponent } from './api'

function comp(overrides: Partial<MatchComponent> = {}): MatchComponent {
  return {
    key: 'test', labelUz: 'Test', labelRu: 'Test', score: 100, weight: 0.1,
    hasData: true, reasonUz: '', reasonRu: '',
    ...overrides,
  }
}

describe('explanationLabel — "Nega bu tavsiya?" qatorlari ishonch bilan belgilanadi', () => {
  it('ma\'lumot yo\'q bo\'lsa "Noma\'lum" / "Неизвестно" (hech qachon mos kelgandek ko\'rsatilmaydi)', () => {
    expect(explanationLabel({ hasData: false, score: 90 }, 'uz')).toBe("Noma'lum")
    expect(explanationLabel({ hasData: false, score: 90 }, 'ru')).toBe('Неизвестно')
  })

  it('ball >= 70 bo\'lsa "Mos keladi"', () => {
    expect(explanationLabel({ hasData: true, score: 70 }, 'uz')).toBe('Mos keladi')
    expect(explanationLabel({ hasData: true, score: 100 }, 'uz')).toBe('Mos keladi')
  })

  it('ball 45-69 oralig\'ida "Qisman mos"', () => {
    expect(explanationLabel({ hasData: true, score: 45 }, 'uz')).toBe('Qisman mos')
    expect(explanationLabel({ hasData: true, score: 69 }, 'uz')).toBe('Qisman mos')
  })

  it('ball 45 dan past bo\'lsa "Mos kelmaydi"', () => {
    expect(explanationLabel({ hasData: true, score: 0 }, 'uz')).toBe('Mos kelmaydi')
    expect(explanationLabel({ hasData: true, score: 44 }, 'uz')).toBe('Mos kelmaydi')
  })
})

describe('pickCaveat — bitta halol eslatma tanlaydi', () => {
  it('foydalanuvchi byudjet kiritgan-u narx ma\'lumoti yo\'q bo\'lsa — shu birinchi o\'rinda', () => {
    const components = [
      comp({ key: 'budget', hasData: false, score: 15 }),
      comp({ key: 'schedule', hasData: true, score: 30 }),
    ]
    const caveat = pickCaveat(components, true)
    expect(caveat?.key).toBe('budget')
  })

  it('byudjet kiritilmagan bo\'lsa — byudjet ma\'lumotsizligi eslatma bo\'lmaydi', () => {
    const components = [
      comp({ key: 'budget', hasData: false, score: 60 }),
      comp({ key: 'language', hasData: true, score: 30 }),
    ]
    const caveat = pickCaveat(components, false)
    expect(caveat?.key).toBe('language')
  })

  it('eng past ballli hasData:true komponent tanlanadi (50 dan past)', () => {
    const components = [
      comp({ key: 'schedule', hasData: true, score: 40 }),
      comp({ key: 'language', hasData: true, score: 20 }),
      comp({ key: 'age', hasData: true, score: 90 }),
    ]
    const caveat = pickCaveat(components, false)
    expect(caveat?.key).toBe('language')
  })

  it('hech qanday muammo topilmasa — null (eslatma ko\'rsatilmaydi)', () => {
    const components = [
      comp({ key: 'schedule', hasData: true, score: 100 }),
      comp({ key: 'language', hasData: true, score: 90 }),
    ]
    expect(pickCaveat(components, false)).toBeNull()
  })
})
