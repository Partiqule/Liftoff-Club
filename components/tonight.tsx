'use client'

import { LocationEditor } from '@/components/location-editor'
import Link from 'next/link'
import { useClub } from '@/components/club-provider'
import { useNow } from '@/components/use-now'
import { skyAt } from '@/lib/weather'
import { compass8, heightPhrase } from '@/lib/geo'
import { leadPass } from '@/lib/planner'
import { Jellyfish } from '@/components/jellyfish'
import { Trail } from '@/components/trail'
import { formatClock } from '@/lib/time'

export function Tonight() {
  const { settings, hydrated, passes, skyState, skyNotice, weather } = useClub()
  const now = useNow()
  const place = settings.location

  if (!hydrated || (place && skyState !== 'ready' && skyState !== 'error')) {
    return (
      <section className="tonight wrap" aria-busy="true">
        <Jellyfish size="load" />
        <p className="kicker">Tonight</p>
        <h1>{place ? `Checking the sky over ${place.label}.` : 'Checking tonight’s sky.'}</h1>
        <p className="lede">Orbits first, then clouds. This takes a moment and stays on your device.</p>
      </section>
    )
  }

  if (!place) {
    return (
      <section className="tonight wrap">
        <p className="kicker">Tonight</p>
        <h1>Where are you watching from?</h1>
        <p className="lede">
          Tell us a town and we will say if the space station crosses it. The launch board below works either way.
        </p>
        <LocationEditor heading={false} />
      </section>
    )
  }

  if (skyState === 'error') {
    return (
      <section className="tonight wrap">
        <p className="kicker">{place.label}</p>
        <h1>The sky chart did not load.</h1>
        <p className="lede">The launch board is still here. Try the sky page again in a minute. Your town is saved on this device.</p>
      </section>
    )
  }

  const lead = leadPass(passes, now)
  if (!lead) {
    return (
      <section className="tonight wrap">
        <p className="kicker">{place.label}</p>
        <h1>Nothing bright crosses tonight.</h1>
        <p className="lede">
          No usable station or Starlink pass showed up in the next day and a half. The rockets on the board may still be worth the broadcast.
        </p>
        {skyNotice ? <p className="note">{skyNotice}</p> : null}
      </section>
    )
  }

  const direction = compass8(lead.riseAzimuth)
  const clock = formatClock(lead.start, place.timezone)
  const judgement = skyAt(weather, lead.peak)
  const who = lead.kind === 'iss' ? 'The station rises' : 'A dim Starlink crosses'
  const glow = judgement.call === 'nogo' ? 'fade' : judgement.call === 'go' ? 'strong' : 'mid'
  return (
    <section className={`tonight wrap light-${glow}`}>
      <Jellyfish size="hero" />
      <Trail glow={glow} />
      <p className="kicker">
        {place.label} · {lead.gradeLabel}
      </p>
      <h1>
        {who}
        <span className="dir">{direction}</span>
        <span className="when">at {clock}</span>
      </h1>
      <p className="lede when-kid">
        {lead.kind === 'iss'
          ? `It looks like a bright star that glides and does not blink. Highest point: ${heightPhrase(lead.maxElevation)}.`
          : 'Starlink satellites are faint steady dots. The station is the one that looks obvious. This is the best of a dim sample.'}{' '}
        Sky call: {judgement.label.toLowerCase()}. {judgement.reason}
      </p>
      <p className="lede when-adult">
        {lead.gradeReason} Max elevation about {Math.round(lead.maxElevation)}°. {judgement.reason}
      </p>
      {skyNotice ? <p className="note">{skyNotice}</p> : null}
      <div className="hero-actions">
        <Link className="btn" href="/sky">
          Plan the viewing
        </Link>
        <span className={glow === 'fade' ? 'light-fade' : 'light-strong'}>{judgement.label}</span>
      </div>
    </section>
  )
}
