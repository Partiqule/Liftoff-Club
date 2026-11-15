import { Countdown } from '@/components/countdown'
import Link from 'next/link'
import { LocalTime } from '@/components/local-time'
import { Patch } from '@/components/patch'
import { StatusStamp } from '@/components/status-stamp'
import type { Launch } from '@/lib/types'

export function FlightStrip({ launch, featured = false }: { launch: Launch; featured?: boolean }) {
  const where = launch.padLocation ?? launch.padName
  return (
    <article className={featured ? 'featured' : undefined}>
      <Link className="strip-link" href={`/launches/${launch.id}`}>
        <Patch provider={launch.provider.name} rocket={launch.rocketName} />
        <div className="strip-copy">
          <StatusStamp abbrev={launch.statusAbbrev} name={launch.statusName} />
          <h3 className="strip-name">{launch.name}</h3>
          <p className="strip-meta">
            {launch.provider.name} · {launch.rocketName}
            <br />
            {where}
            {' · '}
            <LocalTime iso={launch.net} />
          </p>
        </div>
        <div className="strip-count">
          <Countdown net={launch.net} size={featured ? 'lg' : 'md'} />
        </div>
      </Link>
    </article>
  )
}
