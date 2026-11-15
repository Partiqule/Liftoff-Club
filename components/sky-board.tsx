'use client'

import { useClub } from '@/components/club-provider'
import { LocationEditor } from '@/components/location-editor'
import { compass8, heightPhrase } from '@/lib/geo'
import { bestPasses, planForPass } from '@/lib/planner'
import { Jellyfish } from '@/components/jellyfish'
import { Trail } from '@/components/trail'
import { formatClock } from '@/lib/time'
import { skyAt } from '@/lib/weather'

export function SkyBoard() {
  const { settings, hydrated, passes, skyState, skyNotice, weather } = useClub()
  const place = settings.location

  if (!hydrated) {
    return (
      <section className="wrap page">
        <p className="kicker">Sky</p>
        <h1>Opening the chart.</h1>
      </section>
    )
  }
  if (!place) {
    return (
      <section className="wrap page">
        <p className="kicker">Sky</p>
        <h1>A town, then a direction.</h1>
        <LocationEditor heading={false} />
      </section>
    )
  }
  if (skyState === 'loading' || skyState === 'idle') {
    return (
      <section className="wrap page" aria-busy="true">
        <Jellyfish size="load" />
        <p className="kicker">{place.label}</p>
        <h1>Plotting passes.</h1>
        <p className="lede">Station first, then a sample of Starlink. We do not propagate every satellite in the constellation.</p>
      </section>
    )
  }
  if (skyState === 'error') {
    return (
      <section className="wrap page">
        <p className="kicker">{place.label}</p>
        <h1>The orbit feed stumbled.</h1>
        <p className="lede">Refresh in a minute. Launch times on the board do not depend on this chart.</p>
      </section>
    )
  }

  const iss = bestPasses(passes, 'iss', 8)
  const starlink = bestPasses(passes, 'starlink', 6)
  return (
    <section className="wrap page">
      <p className="kicker">{place.label}</p>
      <h1>What crosses the sky.</h1>
      <p className="lede when-kid">
        The space station is the bright one. Starlink satellites are usually dim dots. Give your eyes a minute in the dark.
      </p>
      <p className="lede when-adult">
        Times can miss by a couple of minutes. Starlink is a sample of recent, lower satellites spread across orbit planes, not the full catalog of thousands.
      </p>
      {skyNotice ? <p className="banner">{skyNotice}</p> : null}
      <h2>Space station</h2>
      <PassList passes={iss} place={place.label} timeZone={place.timezone} weather={weather} empty="No station pass in the next day and a half." />
      <h2>Starlink sample</h2>
      <PassList
        passes={starlink}
        place={place.label}
        timeZone={place.timezone}
        weather={weather}
        empty="No Starlink pass cleared the faint-and-low filter tonight."
      />
    </section>
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
        const clock = formatClock(pass.start, timeZone)
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
