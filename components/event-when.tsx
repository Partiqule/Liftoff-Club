'use client'

import { useActiveZone } from '@/components/use-zone'
import { formatLaunchWhen } from '@/lib/pro/time'

export function EventWhen({ iso, precision }: { iso: string | null; precision: string | null }) {
  const zone = useActiveZone()
  if (!iso) return <span>Time not set</span>
  return <time dateTime={iso}>{formatLaunchWhen(iso, precision, null, zone)}</time>
}
