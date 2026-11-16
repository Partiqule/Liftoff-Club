'use client'

import { useClub } from '@/components/club-provider'
import { watchingPlace } from '@/lib/places'
import { compass8, heightPhrase } from '@/lib/geo'
import { bestPasses, planForPass } from '@/lib/planner'
import { Trail } from '@/components/trail'
import { useActiveZone } from '@/components/use-zone'
import { formatClock } from '@/lib/time'
import { zoneAbbrev } from '@/lib/pro/time'
import { skyAt } from '@/lib/weather'
import { isVisibleTrain } from '@/lib/trains'
import { SkyFinderSoon } from '@/components/sky-finder-soon'
import { LocationPrompt } from '@/components/location-prompt'

export function SkyBoard() {
  const { settings, passes, skyState, skyNotice, weather } = useClub()
  const place = watchingPlace(settings.location)
  const zone = useActiveZone()

  if (skyState === 'error') {
    return (
      <section className="wrap page">
        <p className="kicker">{place ? place.label : 'Set your location'}</p>
        <h1>The orbit feed stumbled.</h1>
        <p className="lede">Refresh in a minute. Launch times on the board do not depend on this chart.</p>
        {place ? null : <LocationPrompt />}
        <SkyFinderSoon />
      </section>
    )
  }

  const waiting = skyState === 'loading' || skyState === 'idle'
  const iss = bestPasses(passes, 'iss', 8)
  const starlink = bestPasses(passes, 'starlink', 6)
  const trains = passes.filter(isVisibleTrain).slice(0, 4)
  return (
    <section className="wrap page">
      <p className="kicker">{place ? place.label : 'Set your location'}</p>
      <h1>What crosses the sky.</h1>
      {place ? <p className="meta">Watching from {place.label}</p> : <LocationPrompt />}
      <p className="lede when-kid">
        The space station is the bright one. Starlink satellites are usually dim dots. Give your eyes a minute in the dark.
      </p>
      <p className="lede when-adult">
        Times can miss by a couple of minutes. Starlink is a sample of recent, lower satellites spread across orbit planes, not the full catalog of thousands.
      </p>
      {skyNotice ? <p className="banner">{skyNotice}</p> : null}
      <SkyFinderSoon />
      <h2>Space station</h2>
      {!place ? null : waiting ? <SkySkeleton /> : <PassList passes={iss} place={place.label} timeZone={zone} weather={weather} empty="No station pass in the next day and a half." />}
      <h2>Recent trains</h2>
      <p className="meta">Approximate. Satellites from launches in the last few days, in a dark sky, with the satellites in sunlight. Not the full Starlink list.</p>
      {!place ? null : waiting ? <SkySkeleton /> : <PassList passes={trains} place={place.label} timeZone={zone} weather={weather} empty="No recent train clears the dark sky and cloud check." />}
      <h2>Starlink sample</h2>
      {!place ? null : waiting ? (
        <SkySkeleton />
      ) : (
        <PassList
          passes={starlink}
          place={place.label}
          timeZone={zone}
          weather={weather}
          empty="No Starlink pass cleared the faint-and-low filter tonight."
        />
      )}
    </section>
  )
}

function SkySkeleton() {
  return (
    <div className="sky-skeleton" aria-busy="true" aria-label="Passes are on the way">
      <span className="bone" />
      <span className="bone" />
      <span className="bone bone-short" />
    </div>
  )
}

function PassList({
  passes,
  place,
  timeZone,
  weather,
  empty,
}: {
  passes: ReturnType<typeof bestPasses>
  place: string
  timeZone: string
  weather: ReturnType<typeof useClub>['weather']
  empty: string
}) {
  if (passes.length === 0) return <p className="note">{empty}</p>
  return (
    <ul className="pass-list">
      {passes.map((pass) => {
        const clock = `${formatClock(pass.start, timeZone)} ${zoneAbbrev(timeZone)}`
        const plan = planForPass(pass, place, clock)
        const judgement = skyAt(weather, pass.peak)
        const glow = judgement.call === 'nogo' || pass.grade === 'poor' ? 'fade' : pass.grade === 'great' || pass.grade === 'good' ? 'strong' : 'mid'
        return (
          <li className={`pass light-${glow}`} key={pass.id}>
            <div>
              <Trail glow={glow} />
              <div className="pass-time">{clock}</div>
              <div className="meta">{Math.round(pass.durationSec / 60)} min</div>
            </div>
            <div>
              <strong>{pass.name}</strong>
              <div className="meta">
                Face {compass8(pass.riseAzimuth)}. Highest {heightPhrase(pass.maxElevation)}, toward {compass8(pass.peakAzimuth)}.
              </div>
              <details>
                <summary>Family plan</summary>
                <div className="plan">
                  <div>
                    <strong>When</strong>
                    {plan.when}
                  </div>
                  <div>
                    <strong>Where</strong>
                    {plan.where}
                  </div>
                  <div>
                    <strong>Bring</strong>
                    {plan.bring.join(' ')}
                  </div>
                  <p className="when-kid">{plan.kid}</p>
                  <p className="when-adult">{plan.adult}</p>
                </div>
              </details>
            </div>
            <div>
              <span>{pass.gradeLabel}</span>
              <div className="meta">{judgement.label}</div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
