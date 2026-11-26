'use client'

import { useZonedText } from '@/components/use-zone'
import { formatLaunchWhen } from '@/lib/pro/time'

export function EventWhen({ iso, precision }: { iso: string | null; precision: string | null }) {
  const zoned = useZonedText()
  if (!iso) return <span>Time not set</span>
  return <time dateTime={iso}>{zoned(iso, (value, zone) => formatLaunchWhen(value, precision, null, zone))}</time>
}
