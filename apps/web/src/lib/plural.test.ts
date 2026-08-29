import { describe, it, expect } from 'vitest'
import { pluralRu, institutionsRu, reviewsRu } from './plural'

const FORMS: [string, string, string] = ['один', 'два-четыре', 'много']

describe("pluralRu — rus tili son ko'plik qoidasi", () => {
  it.each([
    [1, 'один'], [21, 'один'], [31, 'один'], [101, 'один'],
    [2, 'два-четыре'], [3, 'два-четыре'], [4, 'два-четыре'], [22, 'два-четыре'],
    [5, 'много'], [11, 'много'], [12, 'много'], [0, 'много'],
  ])('%i -> %s', (n, expected) => {
    expect(pluralRu(n, FORMS)).toBe(expected)
  })
})

describe('institutionsRu / reviewsRu', () => {
  it('CLAUDE.md talab qilgan 7 ta nazorat sonida to\'g\'ri grammatik shaklni tanlaydi', () => {
    expect(institutionsRu(1)).toBe('1 учреждение')
    expect(institutionsRu(2)).toBe('2 учреждения')
    expect(institutionsRu(4)).toBe('4 учреждения')
    expect(institutionsRu(5)).toBe('5 учреждений')
    expect(institutionsRu(11)).toBe('11 учреждений')
    expect(institutionsRu(21)).toBe('21 учреждение')
    expect(institutionsRu(31)).toBe('31 учреждение')

    expect(reviewsRu(1)).toBe('1 отзыв')
    expect(reviewsRu(2)).toBe('2 отзыва')
    expect(reviewsRu(5)).toBe('5 отзывов')
    expect(reviewsRu(11)).toBe('11 отзывов')
  })
})
