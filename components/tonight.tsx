'use client'

import Link from 'next/link'
import { useClub } from '@/components/club-provider'
import { useNow } from '@/components/use-now'
import { skyAt } from '@/lib/weather'
import { compass8, heightPhrase } from '@/lib/geo'
import { leadPass } from '@/lib/planner'
import { isVisibleTrain } from '@/lib/trains'
import { watchingPlace } from '@/lib/places'
import { Trail } from '@/components/trail'
import { LocalTime } from '@/components/local-time'
import { zoneAbbrev } from '@/lib/pro/time'
import { formatClock } from '@/lib/time'
import { useActiveZone } from '@/components/use-zone'
import { pickNext } from '@/lib/schedule'

export function Tonight() {
  const { settings, briefs, passes, skyState, skyNotice, weather } = useClub()
  const now = useNow()
  const place = watchingPlace(settings.location)
  const zone = useActiveZone()
  const town = place.label.split(',')[0]?.trim() || place.label
  const next = pickNext(briefs, now)
  const lead = skyState === 'ready' ? leadPass(passes, now) : null
  const judgement = lead ? skyAt(weather, lead.peak) : null
  const glow = judgement?.call === 'nogo' ? 'fade' : judgement?.call === 'go' ? 'strong' : 'mid'
  const direction = lead ? compass8(lead.riseAzimuth) : null
  const clock = lead ? `${formatClock(lead.start, zone)} ${zoneAbbrev(zone)}` : null
  const who = lead ? (lead.kind === 'iss' ? 'The station rises' : 'A dim Starlink crosses') : null

  return (
    <section className={`tonight wrap light-${glow}`} aria-busy={skyState === 'loading' || skyState === 'idle'}>
      <Trail glow={glow} span="hero" />
      <p className="kicker">Tonight over {town}</p>
      <p className="flourish">Ad astra</p>
      <h1>
        Tonight over {town}
        {next ? <span className="when">{next.name}</span> : null}
      </h1>
      {who && direction && clock ? (
        <p className="lede">
          {who} {direction} at {clock}.
        </p>
      ) : null}
      {who && direction && clock ? (
        <>
          <p className="lede when-kid">
            {lead?.kind === 'iss'
              ? `It looks like a bright star that glides and does not blink. Highest point: ${heightPhrase(lead.maxElevation)}.`
              : 'Starlink satellites are faint steady dots. The station is the one that looks obvious. This is the best of a dim sample.'}{' '}
            {judgement?.label}
          </p>
          <p className="lede when-adult">
            {lead?.gradeReason} Max elevation about {Math.round(lead?.maxElevation ?? 0)}°. {judgement?.reason}
          </p>
        </>
      ) : skyState === 'error' ? (
        <p className="lede">The sky chart is resting. The next rocket is still listed below.</p>
      ) : (
        <p className="lede">The sky chart is settling. The next rocket is already listed.</p>
      )}
      {next ? (
        <p className="hero-next">
          <Link href={`/launches/${next.id}`}>Next launch: {next.name}</Link>
          {next.net ? (
            <span className="meta">
              {' · '}
              <LocalTime iso={next.net} />
            </span>
          ) : null}
        </p>
      ) : (
        <p className="hero-next">
          Next launch not posted yet. <Link href="/launches">See the full schedule</Link>
        </p>
      )}
      {passes.some(isVisibleTrain) ? (
        <p className="note">
          A recent Starlink train may be visible. Times are approximate.{' '}
          <Link href="/sky">See the sky chart</Link>
        </p>
      ) : null}
      {skyNotice ? <p className="note">{skyNotice}</p> : null}
      <div className="hero-actions">
        <Link className="btn" href="/sky">
          Plan the viewing
        </Link>
      </div>
    </section>
  )
}
