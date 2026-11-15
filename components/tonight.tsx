'use client'

import Link from 'next/link'
import { useClub } from '@/components/club-provider'
import { useNow } from '@/components/use-now'
import { skyAt } from '@/lib/weather'
import { compass8, heightPhrase } from '@/lib/geo'
import { leadPass } from '@/lib/planner'
import { watchingPlace } from '@/lib/places'
import { Trail } from '@/components/trail'
import { LocalTime } from '@/components/local-time'
import { formatClock } from '@/lib/time'

export function Tonight() {
  const { settings, briefs, passes, skyState, skyNotice, weather } = useClub()
  const now = useNow()
  const place = watchingPlace(settings.location)
  const town = place.label.split(',')[0]?.trim() || place.label
  const next = briefs.find((item) => item.featured) ?? briefs[0]
  const lead = skyState === 'ready' ? leadPass(passes, now) : null
  const judgement = lead ? skyAt(weather, lead.peak) : null
  const glow = judgement?.call === 'nogo' ? 'fade' : judgement?.call === 'go' ? 'strong' : 'mid'
  const direction = lead ? compass8(lead.riseAzimuth) : null
  const clock = lead ? formatClock(lead.start, place.timezone) : null
  const who = lead ? (lead.kind === 'iss' ? 'The station rises' : 'A dim Starlink crosses') : null

  return (
    <section className={`tonight wrap light-${glow}`} aria-busy={skyState === 'loading' || skyState === 'idle'}>
      <Trail glow={glow} span="hero" />
      <p className="kicker">Tonight over {town}</p>
      <p className="flourish">Ad astra</p>
      {who && direction && clock ? (
        <>
          <h1>
            {who}
            <span className="dir">{direction}</span>
            <span className="when">at {clock}</span>
          </h1>
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
        <>
          <h1>The launch board is ready.</h1>
          <p className="lede">The sky chart is resting. The next rocket is still listed below.</p>
        </>
      ) : (
        <div className="sky-skeleton" aria-hidden="true">
          <span className="bone bone-title" />
          <span className="bone" />
          <span className="bone bone-short" />
        </div>
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
