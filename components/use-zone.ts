'use client'

import { useSyncExternalStore } from 'react'
import { useClub } from '@/components/club-provider'
import { isTimeZone } from '@/lib/pro/time'
import { formatWhen, textWhenReady } from '@/lib/time'

function subscribe() {
  return () => {}
}

export function useActiveZone(): string {
  const { settings } = useClub()
  const fallback = settings.location?.timezone || 'UTC'
  const browser = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || fallback
      } catch {
        return fallback
      }
    },
    () => fallback,
  )
  if (settings.zoneMode === 'chosen' && isTimeZone(settings.zone)) return settings.zone
  return browser
}

/** False during server render and hydration, true after the client zone can be read. */
export function useClientReady(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false)
}

/** Format a clock in the visitor zone, or the stable fallback until that zone is known. */
export function useZonedText() {
  const zone = useActiveZone()
  const ready = useClientReady()
  return (
    iso: string | null | undefined,
    format: (iso: string, timeZone: string) => string = (value, timeZone) => formatWhen(value, timeZone),
  ) => textWhenReady(iso, ready ? zone : null, ready, format)
}
