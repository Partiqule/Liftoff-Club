'use client'

import { useClub } from '@/components/club-provider'
import Link from 'next/link'
import { planForLaunch } from '@/lib/planner'
import { zoneAbbrev } from '@/lib/pro/time'
import { formatClock } from '@/lib/time'
import { useActiveZone } from '@/components/use-zone'
import type { Launch } from '@/lib/types'
import { seeLaunch } from '@/lib/visibility'
import { skyAt } from '@/lib/weather'

export function VisibilityCard({ launch }: { launch: Launch }) {
  const { settings, weather } = useClub()
  const zone = useActiveZone()
  const verdict = seeLaunch(launch, settings.location)
  const clock = launch.net && settings.location ? `${formatClock(launch.net, zone)} ${zoneAbbrev(zone)}` : null
  const plan = planForLaunch(verdict, settings.location?.label ?? 'your town', clock)
  const sky = launch.net ? skyAt(weather, launch.net) : null
  return (
    <section className="verdict">
      <p className="kicker">From here</p>
      <h2>{verdict.grade === 'likely' ? 'You might see it' : verdict.grade === 'maybe' ? 'Maybe, if the sky helps' : verdict.grade === 'too-far' ? 'Too far to see' : verdict.grade === 'unlikely' ? 'A long shot' : 'Need a town'}</h2>
      <p className="story when-kid">{verdict.summary}</p>
      <p className="lede when-adult">{verdict.detail}</p>
      {sky && verdict.grade !== 'too-far' && verdict.grade !== 'unknown' ? (
        <p>
          <span className={`pill pill-${sky.call}`}>{sky.label}</span> {sky.reason}
        </p>
      ) : null}
      {plan ? (
        <div className="plan">
          <div>
            <strong>When to go out</strong>
            {plan.when}
          </div>
          <div>
            <strong>Where to look</strong>
            {plan.where}
          </div>
          <div>
            <strong>What to bring</strong>
            {plan.bring.join(' · ')}
          </div>
        </div>
      ) : null}
      {!settings.location ? (
        <p>
          <Link href="/settings#place">Set your town</Link> for a distance and a direction.
        </p>
      ) : null}
    </section>
  )
}
