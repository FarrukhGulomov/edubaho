'use client'

import {
  createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode,
} from 'react'
import { track } from '@/lib/analytics'
import { MAX_COMPARE } from '@/lib/compareConstants'

export { MAX_COMPARE }

export interface CompareItem {
  id: string
  slug: string
  nameUz: string
  nameRu?: string
  type: string
  avgRating?: number
  pricing?: { monthlyMin?: number }
}

const KEY = 'edu_compare'
const SAVED_KEY = 'edu_saved'

export type CompareAddResult = 'added' | 'exists' | 'max'
export type CompareToastKind = 'added' | 'removed' | 'max' | 'saved' | 'unsaved'

export interface CompareToast {
  id: number
  kind: CompareToastKind
  itemName?: string
  count: number
}

function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern)
  } catch {
    // Qo'llab-quvvatlanmasa jim o'tkazamiz
  }
}

// ─────────────────────────────────────────────────────────────
// Compare — bitta umumiy Context orqali barcha komponentlar
// (qidiruv kartalari, muassasa sahifasi, floating bar) bir xil
// holatni ko'radi. Avval har bir komponent o'z alohida
// useState nusxasiga ega edi — biri o'zgarganda boshqasi
// darhol yangilanmasdi (floating bar sinxronlashmas edi).
// ─────────────────────────────────────────────────────────────

interface CompareContextValue {
  items: CompareItem[]
  add: (item: CompareItem) => CompareAddResult
  remove: (id: string) => void
  toggle: (item: CompareItem) => CompareAddResult | 'removed'
  clear: () => void
  isSelected: (id: string) => boolean
  count: number
  toast: CompareToast | null
  dismissToast: () => void
}

const CompareContext = createContext<CompareContextValue | null>(null)

interface SavedContextValue {
  saved: CompareItem[]
  toggleSave: (item: CompareItem) => void
  isSaved: (id: string) => boolean
}

const SavedContext = createContext<SavedContextValue | null>(null)

export function CompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CompareItem[]>([])
  const [saved, setSaved] = useState<CompareItem[]>([])
  const [toast, setToast] = useState<CompareToast | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastSeq = useRef(0)

  useEffect(() => {
    try {
      const s1 = localStorage.getItem(KEY)
      if (s1) setItems(JSON.parse(s1))
      const s2 = localStorage.getItem(SAVED_KEY)
      if (s2) setSaved(JSON.parse(s2))
    } catch {
      // ignore
    }
  }, [])

  const showToast = useCallback((kind: CompareToastKind, count: number, itemName?: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastSeq.current += 1
    setToast({ id: toastSeq.current, kind, itemName, count })
    toastTimer.current = setTimeout(() => setToast(null), 3200)
  }, [])

  const dismissToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(null)
  }, [])

  const add = useCallback((item: CompareItem): CompareAddResult => {
    if (items.find((i) => i.id === item.id)) {
      return 'exists'
    }
    if (items.length >= MAX_COMPARE) {
      showToast('max', items.length)
      vibrate(30)
      return 'max'
    }
    const next = [...items, item]
    setItems(next)
    localStorage.setItem(KEY, JSON.stringify(next))
    showToast('added', next.length, item.nameUz)
    vibrate(12)
    track('institution_compare', { category: 'institution', institutionId: item.id, properties: { compareCount: next.length } })
    return 'added'
  }, [items, showToast])

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id)
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const toggle = useCallback((item: CompareItem): CompareAddResult | 'removed' => {
    if (items.find((i) => i.id === item.id)) {
      const next = items.filter((i) => i.id !== item.id)
      setItems(next)
      localStorage.setItem(KEY, JSON.stringify(next))
      vibrate(8)
      return 'removed'
    }
    return add(item)
  }, [items, add])

  const clear = useCallback(() => {
    setItems([])
    localStorage.removeItem(KEY)
  }, [])

  const isSelected = useCallback((id: string) => items.some((i) => i.id === id), [items])

  const toggleSave = useCallback((item: CompareItem) => {
    setSaved((prev) => {
      const exists = prev.find((i) => i.id === item.id)
      const next = exists ? prev.filter((i) => i.id !== item.id) : [item, ...prev]
      localStorage.setItem(SAVED_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const isSaved = useCallback((id: string) => saved.some((i) => i.id === id), [saved])

  const compareValue: CompareContextValue = {
    items, add, remove, toggle, clear, isSelected, count: items.length, toast, dismissToast,
  }
  const savedValue: SavedContextValue = { saved, toggleSave, isSaved }

  return (
    <CompareContext.Provider value={compareValue}>
      <SavedContext.Provider value={savedValue}>
        {children}
      </SavedContext.Provider>
    </CompareContext.Provider>
  )
}

export function useCompare(): CompareContextValue {
  const ctx = useContext(CompareContext)
  if (!ctx) throw new Error('useCompare CompareProvider ichida chaqirilishi shart')
  return ctx
}

export function useSaved(): SavedContextValue {
  const ctx = useContext(SavedContext)
  if (!ctx) throw new Error('useSaved CompareProvider ichida chaqirilishi shart')
  return ctx
}
