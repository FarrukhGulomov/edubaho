import { describe, it, expect } from 'vitest'
import { authHref } from './authHref'

describe('authHref — open-redirect himoyasi', () => {
  it('next bo\'lmasa /auth qaytaradi', () => {
    expect(authHref()).toBe('/auth')
  })

  it('ichki yo\'l uchun ?next= bilan qaytaradi', () => {
    expect(authHref('/institutions/some-slug')).toBe('/auth?next=%2Finstitutions%2Fsome-slug')
  })

  it('tashqi domenga (protocol-relative //) yo\'l qo\'ymaydi', () => {
    expect(authHref('//evil.com')).toBe('/auth')
  })

  it('http(s):// bilan boshlangan tashqi URL\'ni rad etadi', () => {
    expect(authHref('https://evil.com')).toBe('/auth')
  })

  it('/auth bilan boshlangan next\'ni cheksiz redirect siklidan qochish uchun rad etadi', () => {
    expect(authHref('/auth/somewhere')).toBe('/auth')
  })
})
