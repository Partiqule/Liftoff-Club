'use client'

import { useActiveZone } from '@/components/use-zone'
import { zoneAbbrev } from '@/lib/pro/time'
import { formatClock, formatWhen } from '@/lib/time'

export function LocalTime({
  iso,
  timeZone,
  clock = false,
}: {
  iso: string | null
  timeZone?: string
  clock?: boolean
}) {
  const active = useActiveZone()
  if (!iso) return <span>Time not set</span>
  const zone = timeZone || active
  const text = clock ? `${formatClock(iso, zone)} ${zoneAbbrev(zone)}` : formatWhen(iso, zone)
  return <time dateTime={iso}>{text}</time>
}
