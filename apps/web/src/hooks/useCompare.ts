'use client'

import { useState, useEffect, useCallback } from 'react'

export interface CompareItem {
  id: string
  slug: string
  nameUz: string
  type: string
  avgRating?: number
  pricing?: { monthlyMin?: number }
}

const KEY = 'edu_compare'
const MAX = 3

export function useCompare() {
  const [items, setItems] = useState<CompareItem[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY)
      if (stored) setItems(JSON.parse(stored))
    } catch {
      // ignore
    }
  }, [])

  const save = useCallback((next: CompareItem[]) => {
    setItems(next)
    localStorage.setItem(KEY, JSON.stringify(next))
  }, [])

  const add = useCallback((item: CompareItem) => {
    setItems((prev) => {
      if (prev.find((i) => i.id === item.id)) return prev
      const next = prev.length >= MAX ? [...prev.slice(1), item] : [...prev, item]
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id)
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const toggle = useCallback((item: CompareItem) => {
    setItems((prev) => {
      const exists = prev.find((i) => i.id === item.id)
      const next = exists
        ? prev.filter((i) => i.id !== item.id)
        : prev.length >= MAX
          ? [...prev.slice(1), item]
          : [...prev, item]
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const clear = useCallback(() => {
    setItems([])
    localStorage.removeItem(KEY)
  }, [])

  const isSelected = useCallback((id: string) => items.some((i) => i.id === id), [items])

  return { items, add, remove, toggle, clear, isSelected, count: items.length }
}

// Saved institutions hook
const SAVED_KEY = 'edu_saved'

export function useSaved() {
  const [saved, setSaved] = useState<CompareItem[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SAVED_KEY)
      if (stored) setSaved(JSON.parse(stored))
    } catch {
      // ignore
    }
  }, [])

  const toggleSave = useCallback((item: CompareItem) => {
    setSaved((prev) => {
      const exists = prev.find((i) => i.id === item.id)
      const next = exists ? prev.filter((i) => i.id !== item.id) : [item, ...prev]
      localStorage.setItem(SAVED_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const isSaved = useCallback((id: string) => saved.some((i) => i.id === id), [saved])

  return { saved, toggleSave, isSaved }
}
