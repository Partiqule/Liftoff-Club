'use client'

import { useSyncExternalStore } from 'react'

let timer: number | null = null
const listeners = new Set<() => void>()

function currentTime(): number {
  return Math.floor(Date.now() / 1000) * 1000
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (timer == null && typeof window !== 'undefined') {
    timer = window.setInterval(() => {
      listeners.forEach((item) => item())
    }, 60_000)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && timer != null) {
      window.clearInterval(timer)
      timer = null
    }
  }
}

export function useNow(): number {
  return useSyncExternalStore(subscribe, currentTime, currentTime)
}
