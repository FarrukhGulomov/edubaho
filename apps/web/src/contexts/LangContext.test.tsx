import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { LangProvider, useLang, t } from './LangContext'

function Probe() {
  const { lang, setLang } = useLang()
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="copy">{t(lang, { uz: "Salom", ru: 'Привет' })}</span>
      <button onClick={() => setLang('ru')}>ru</button>
    </div>
  )
}

describe('LangProvider — til tanlash', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("localStorage bo'sh bo'lsa standart 'uz' bilan boshlanadi (SSR bilan mos, hydration xatosiz)", () => {
    render(<LangProvider><Probe /></LangProvider>)
    expect(screen.getByTestId('lang').textContent).toBe('uz')
    expect(screen.getByTestId('copy').textContent).toBe('Salom')
  })

  it("localStorage'da 'ru' saqlangan bo'lsa shu til bilan ochiladi", () => {
    localStorage.setItem('edu_lang', 'ru')
    render(<LangProvider><Probe /></LangProvider>)
    expect(screen.getByTestId('lang').textContent).toBe('ru')
    expect(screen.getByTestId('copy').textContent).toBe('Привет')
  })

  it("setLang chaqirilganda til va localStorage yangilanadi", () => {
    render(<LangProvider><Probe /></LangProvider>)
    act(() => {
      screen.getByText('ru').click()
    })
    expect(screen.getByTestId('lang').textContent).toBe('ru')
    expect(localStorage.getItem('edu_lang')).toBe('ru')
  })

  it("noto'g'ri qiymat localStorage'da bo'lsa 'uz'da qoladi (faqat 'ru' qabul qilinadi)", () => {
    localStorage.setItem('edu_lang', 'fr')
    render(<LangProvider><Probe /></LangProvider>)
    expect(screen.getByTestId('lang').textContent).toBe('uz')
  })
})
