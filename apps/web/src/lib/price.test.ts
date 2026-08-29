import { describe, it, expect } from 'vitest'
import { formatUzs, formatNum, priceFrom, amountFrom } from './price'

describe('formatUzs — CLAUDE.md UZS format qoidasi', () => {
  it("bo'shliq ajratuvchi + so'm suffiksi bilan formatlaydi", () => {
    expect(formatUzs(1500000)).toBe("1 500 000 so'm")
    expect(formatUzs(600000)).toBe("600 000 so'm")
  })

  it('vergul ISHLATMAYDI (CLAUDE.md taqiqlaydi)', () => {
    expect(formatUzs(1500000)).not.toContain(',')
  })
})

describe('priceFrom — davr aniq bo\'lganda mos matn', () => {
  it("oylik narx bo'lsa 'Oyiga ... dan' (uz) qaytaradi", () => {
    const label = priceFrom({ monthlyMin: 600000 }, 'uz')
    expect(label?.full).toBe("Oyiga 600 000 so'mdan")
    expect(label?.short).toBe("600 000 so'm/oy")
  })

  it("faqat yillik narx bo'lsa 'Yiliga ... dan' qaytaradi", () => {
    const label = priceFrom({ yearlyMin: 6000000 }, 'uz')
    expect(label?.full).toBe('Yiliga 6 000 000 so\'mdan')
  })

  it('ma\'lumot bo\'lmasa null qaytaradi (taxmin qilinmaydi)', () => {
    expect(priceFrom(null, 'uz')).toBeNull()
    expect(priceFrom({}, 'uz')).toBeNull()
    expect(priceFrom({ monthlyMin: 0 }, 'uz')).toBeNull()
  })

  it('rus tilida "сум" ishlatadi, "so\'m" emas', () => {
    const label = priceFrom({ monthlyMin: 600000 }, 'ru')
    expect(label?.full).toContain('сум')
    expect(label?.full).not.toContain("so'm")
  })

  it('monthlyMin ustunlik qiladi, yearlyMin bo\'lsa ham', () => {
    const label = priceFrom({ monthlyMin: 600000, yearlyMin: 6000000 }, 'uz')
    expect(label?.full).toContain('Oyiga')
  })
})

describe('amountFrom — davri noma\'lum summa', () => {
  it('"oylik/yillik" deb taxmin qilmaydi, faqat "dan" qo\'shadi', () => {
    expect(amountFrom(500000, 'uz')).toBe("500 000 so'mdan")
    expect(amountFrom(500000, 'ru')).toBe('от 500 000 сум')
  })
})

describe('formatNum', () => {
  it('birliksiz raqam formatlaydi', () => {
    expect(formatNum(1234567)).toBe('1 234 567')
  })
})
