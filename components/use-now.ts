'use client'

import { useSyncExternalStore } from 'react'

let clock = 0
let timer: number | null = null
const listeners = new Set<() => void>()

function currentTime(): number {
  if (clock === 0) clock = Date.now()
  return clock
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (timer == null) {
    timer = window.setInterval(() => {
      clock = Date.now()
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
  return useSyncExternalStore(subscribe, currentTime, () => 0)
}
