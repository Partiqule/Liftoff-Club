'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { emptyStore, PRO_STORE_KEY, sanitizeStore, type ProStore } from '@/lib/pro/watch'

const listeners = new Set<() => void>()
let current: ProStore = emptyStore()
let loaded = false

function emit() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function commitProStore(next: ProStore) {
  current = next
  loaded = true
  if (typeof window !== 'undefined') window.localStorage.setItem(PRO_STORE_KEY, JSON.stringify(next))
  emit()
}

function readStore(): ProStore {
  return current
}

function readReady(): boolean {
  return loaded
}

export function useProStore(): { store: ProStore; setStore: (next: ProStore) => void; ready: boolean } {
  const store = useSyncExternalStore(subscribe, readStore, () => emptyStore())
  const ready = useSyncExternalStore(subscribe, readReady, () => false)

  useEffect(() => {
    if (loaded) return
    loaded = true
    try {
      const raw = window.localStorage.getItem(PRO_STORE_KEY)
      if (raw) current = sanitizeStore(JSON.parse(raw))
    } catch {
      current = emptyStore()
    }
    emit()
  }, [])

  return { store, setStore: commitProStore, ready }
}
