'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useClub } from '@/components/club-provider'
import { buildBrief, type BriefPeriod } from '@/lib/brief'
import { useNow } from '@/components/use-now'

export default function BriefPage() {
  const { briefs, passes, settings } = useClub()
  const now = useNow()
  const [period, setPeriod] = useState<BriefPeriod>('day')
  const message = buildBrief({
    period,
    now,
    launches: briefs.map((item) => ({
      id: item.id,
      name: item.name,
      net: item.net,
      providerName: item.providerName,
      rocketName: item.rocketName,
      padName: item.padName,
      padLocation: item.padLocation,
    })),
    passes,
    placeLabel: settings.location?.label ?? null,
  })
  return (
    <main id="content" className="wrap page">
      <p className="kicker">On this screen</p>
      <h1>{period === 'day' ? 'Today' : 'This week'}</h1>
      <p className="lede">{message.sky}</p>
      <div className="choice" role="group" aria-label="Brief length">
        <button className="btn btn-quiet" type="button" aria-pressed={period === 'day'} onClick={() => setPeriod('day')}>
          Daily
        </button>
        <button className="btn btn-quiet" type="button" aria-pressed={period === 'week'} onClick={() => setPeriod('week')}>
          Weekly
        </button>
      </div>
      <ul className="jobs">
        {message.launches.map((launch) => (
          <li key={launch.id}>
            <h3>
              <Link href={`/launches/${launch.id}`}>{launch.name}</Link>
            </h3>
            <p className="meta">{launch.line}</p>
          </li>
        ))}
      </ul>
      {message.launches.length === 0 ? <p className="note">No launch is listed in this window.</p> : null}
      <p className="note">This note stays on the screen. The same text is ready for a later email or text, which is not connected.</p>
    </main>
  )
}
