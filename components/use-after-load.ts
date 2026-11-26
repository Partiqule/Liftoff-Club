'use client'

import { useEffect, useState } from 'react'

/** Start heavy pictures after the first view has loaded. */
export function useAfterLoad(): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let idle = 0
    let timer = 0
    const go = () => {
      if (typeof requestIdleCallback === 'function') idle = requestIdleCallback(() => setReady(true), { timeout: 1200 })
      else timer = window.setTimeout(() => setReady(true), 600)
    }
    if (document.readyState === 'complete') go()
    else window.addEventListener('load', go, { once: true })
    return () => {
      window.removeEventListener('load', go)
      if (idle) cancelIdleCallback(idle)
      if (timer) window.clearTimeout(timer)
    }
  }, [])
  return ready
}
