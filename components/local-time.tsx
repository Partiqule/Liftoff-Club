'use client'

import { useZonedText } from '@/components/use-zone'
import { zoneAbbrev } from '@/lib/pro/time'
import { formatClock, formatWhen, textWhenReady } from '@/lib/time'

export function LocalTime({
  iso,
  timeZone,
  clock = false,
}: {
  iso: string | null
  timeZone?: string
  clock?: boolean
}) {
  const zoned = useZonedText()
  if (!iso) return <span>Time not set</span>
  const format = (value: string, zone: string) => (clock ? `${formatClock(value, zone)} ${zoneAbbrev(zone)}` : formatWhen(value, zone))
  const text = timeZone ? textWhenReady(iso, timeZone, true, format) : zoned(iso, format)
  return <time dateTime={iso}>{text}</time>
}
