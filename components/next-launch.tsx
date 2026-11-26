'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Countdown } from '@/components/countdown'
import { LocationPrompt } from '@/components/location-prompt'
import { useClub } from '@/components/club-provider'
import { useZonedText } from '@/components/use-zone'
import { VisibilityCard } from '@/components/visibility-card'
import { HOME_COPY, missionTitle, placeLine, rocketTitle } from '@/lib/home-copy'
import type { HomeCard } from '@/lib/home-card'
import { formatLaunchWhen } from '@/lib/pro/time'

export function NextLaunchCard({ launch }: { launch: HomeCard | null }) {
  const { settings } = useClub()
  const zoned = useZonedText()
  const [open, setOpen] = useState(false)

  if (!launch) {
    return (
      <section className="next-card wrap">
        <p className="kicker">{HOME_COPY.kicker}</p>
        <h1>{HOME_COPY.emptyTitle}</h1>
        <p className="lede">{HOME_COPY.emptyLede}</p>
      </section>
    )
  }

  const mission = missionTitle(launch)
  return (
    <section className="next-card wrap">
      <p className="kicker">{HOME_COPY.kicker}</p>
      <Link className="next-title" href={`/launches/${launch.id}`}>
        <h1>{rocketTitle(launch)}</h1>
        {mission ? <p className="next-mission">{mission}</p> : null}
      </Link>
      <p className="meta next-place">{placeLine(launch)}</p>
      <p className="meta next-when">
        {launch.net ? (
          <time dateTime={launch.net}>{zoned(launch.net, (iso, zone) => formatLaunchWhen(iso, launch.precision, null, zone))}</time>
        ) : (
          'Time not set'
        )}
      </p>
      <Countdown net={launch.net} size="lg" />
      <p className="next-see">
        <button
          className="btn"
          type="button"
          aria-expanded={open}
          aria-controls="from-here"
          onClick={() => setOpen((value) => !value)}
        >
          {HOME_COPY.see}
        </button>
      </p>
      {open ? (
        <div id="from-here">
          {settings.location ? <VisibilityCard launch={{ ...launch, windowEnd: null }} /> : <LocationPrompt />}
          <p className="note">{HOME_COPY.guess}</p>
        </div>
      ) : null}
    </section>
  )
}
