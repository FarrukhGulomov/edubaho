// ─────────────────────────────────────────────────────────────
// EduReyting.uz — Umumiy konstantalar
// ─────────────────────────────────────────────────────────────

import type { InstitutionType } from './types'

// ─── Muassasa turlari (UZ/RU) ────────────────────────────────

export const INSTITUTION_TYPE_LABELS: Record<InstitutionType, { uz: string; ru: string }> = {
  KINDERGARTEN:    { uz: "Bog'cha",           ru: 'Детский сад' },
  SCHOOL:          { uz: 'Maktab',            ru: 'Школа' },
  LYCEUM:          { uz: 'Litsey',            ru: 'Лицей' },
  COLLEGE:         { uz: 'Kollej',            ru: 'Колледж' },
  UNIVERSITY:      { uz: 'Universitet',       ru: 'Университет' },
  COURSE_CENTER:   { uz: 'Kurs markazi',      ru: 'Курсовой центр' },
  LANGUAGE_CENTER: { uz: 'Til markazi',       ru: 'Языковой центр' },
  IT_SCHOOL:       { uz: "IT maktabi",        ru: 'IT Школа' },
  TUTORING:        { uz: 'Repetitor',         ru: 'Репетитор' },
  SPORTS_SCHOOL:   { uz: 'Sport maktabi',     ru: 'Спортивная школа' },
  ARTS_SCHOOL:     { uz: "San'at maktabi",    ru: 'Школа искусств' },
}

// ─── To'lov usullari ─────────────────────────────────────────

export const PAYMENT_METHOD_LABELS: Record<string, { uz: string; ru: string }> = {
  payme:   { uz: 'Payme',   ru: 'Payme' },
  click:   { uz: 'Click',   ru: 'Click' },
  uzcard:  { uz: 'Uzcard',  ru: 'Uzcard' },
  humo:    { uz: 'Humo',    ru: 'Humo' },
  cash:    { uz: 'Naqd',    ru: 'Наличные' },
}

// ─── Xususiyat kalitlari ──────────────────────────────────────

export const FEATURE_LABELS: Record<string, { uz: string; ru: string }> = {
  transport:  { uz: 'Transport',         ru: 'Транспорт' },
  cafeteria:  { uz: 'Oshxona',           ru: 'Столовая' },
  sport:      { uz: 'Sport zali',        ru: 'Спортзал' },
  library:    { uz: 'Kutubxona',         ru: 'Библиотека' },
  lab:        { uz: 'Laboratoriya',      ru: 'Лаборатория' },
  pool:       { uz: 'Basseyn',           ru: 'Бассейн' },
  security:   { uz: 'Qorovul',          ru: 'Охрана' },
  wifi:       { uz: 'Wi-Fi',             ru: 'Wi-Fi' },
  parking:    { uz: 'Avtoturargoh',      ru: 'Парковка' },
  medical:    { uz: 'Tibbiy xona',       ru: 'Медпункт' },
  playground: { uz: "O'yin maydoni",     ru: 'Детская площадка' },
  dormitory:  { uz: 'Yotoqxona',         ru: 'Общежитие' },
  tutoring:   { uz: 'Qo\'shimcha dars',  ru: 'Дополнительные занятия' },
  online:     { uz: 'Online darslar',    ru: 'Онлайн занятия' },
}

// ─── Reyting ─────────────────────────────────────────────────

export const RATING_LABELS: Record<number, { uz: string; ru: string }> = {
  1: { uz: "Juda yomon",  ru: 'Очень плохо' },
  2: { uz: 'Yomon',       ru: 'Плохо' },
  3: { uz: "O'rtacha",    ru: 'Среднее' },
  4: { uz: 'Yaxshi',      ru: 'Хорошо' },
  5: { uz: 'Ajoyib',      ru: 'Отлично' },
}

// ─── Pagination ───────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 50

// ─── Narx ────────────────────────────────────────────────────

export const CURRENCY = 'UZS'

/**
 * UZS formatida narxni ko'rsatish
 * 1500000 → "1 500 000 so'm"
 */
export function formatUzs(amount: number): string {
  return `${amount.toLocaleString('uz-UZ').replace(/,/g, ' ')} so'm`
}
