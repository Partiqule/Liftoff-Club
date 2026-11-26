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
import { zoneAbbrev } from '@/lib/pro/time'
import { formatClock } from '@/lib/time'
import { useZonedText } from '@/components/use-zone'
import { SkyFinderCard } from '@/components/sky-finder-card'
import { LocationPrompt } from '@/components/location-prompt'

export function Tonight() {
  const { settings, passes, skyState, skyNotice, weather } = useClub()
  const now = useNow()
  const place = watchingPlace(settings.location)
  const zoned = useZonedText()
  const town = place?.label.split(',')[0]?.trim() || place?.label || ''
  const lead = skyState === 'ready' ? leadPass(passes, now) : null
  const judgement = lead ? skyAt(weather, lead.peak) : null
  const tone = judgement?.call === 'nogo' ? 'fade' : judgement?.call === 'go' ? 'strong' : 'mid'
  const direction = lead ? compass8(lead.riseAzimuth) : null
  const clock = lead ? zoned(lead.start, (iso, zone) => `${formatClock(iso, zone)} ${zoneAbbrev(zone)}`) : null
  const who = lead ? (lead.kind === 'iss' ? 'The station rises' : 'A dim Starlink crosses') : null

  return (
    <section className={`tonight wrap light-${tone}`} aria-busy={skyState === 'loading' || skyState === 'idle'}>
      <p className="kicker">{place ? `Tonight over ${town}` : 'Set your location'}</p>
      <Trail tone={tone} span="hero" />
      <p className="flourish">Ad astra</p>
      <h1>{place ? `Tonight over ${town}` : 'Tonight'}</h1>
      {place ? <p className="meta">Watching from {place.label}</p> : <LocationPrompt />}
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
        <p className="lede">The orbit feed stumbled. Refresh in a minute. Launch times on the board do not depend on this chart.</p>
      ) : (
        <p className="lede">The sky chart is settling.</p>
      )}
      {passes.some(isVisibleTrain) ? (
        <p className="note">
          A recent Starlink train may be visible. Times are approximate.{' '}
          <Link href="#trains">See the sky chart</Link>
        </p>
      ) : null}
      {skyNotice ? <p className="note">{skyNotice}</p> : null}
      <div className="hero-actions">
        <Link className="btn" href="/sky/finder">
          Plan the viewing
        </Link>
      </div>
      <SkyFinderCard />
    </section>
  )
}
