'use client'

import { useSyncExternalStore } from 'react'
import { useClub } from '@/components/club-provider'
import { formatClock, formatWhen } from '@/lib/time'

function subscribe() {
  return () => {}
}

export function LocalTime({
  iso,
  timeZone,
  clock = false,
}: {
  iso: string | null
  timeZone?: string
  clock?: boolean
}) {
  const { settings } = useClub()
  const browserZone = useSyncExternalStore(
    subscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => 'UTC',
  )
  if (!iso) return <span>Time not set</span>
  const zone = timeZone || settings.location?.timezone || browserZone
  const text = clock ? formatClock(iso, zone) : formatWhen(iso, zone)
  return <time dateTime={iso}>{text}</time>
}
