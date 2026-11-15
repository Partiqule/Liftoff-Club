'use client'

import { useSyncExternalStore } from 'react'
import { useClub } from '@/components/club-provider'
import { isTimeZone } from '@/lib/pro/time'

function subscribe() {
  return () => {}
}

export function useActiveZone(): string {
  const { settings } = useClub()
  const fallback = settings.location?.timezone || 'America/Denver'
  const browser = useSyncExternalStore(
    subscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || fallback,
    () => fallback,
  )
  if (settings.zoneMode === 'chosen' && isTimeZone(settings.zone)) return settings.zone
  return browser
}
