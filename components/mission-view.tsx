'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FigureLine } from '@/components/pro/figure-line'
import { LaunchDayScreen } from '@/components/launch-day'
import { Logo } from '@/components/logo'
import { MissionGlobe } from '@/components/mission-globe'
import { Trail } from '@/components/trail'
import {
  approximateInclination,
  currentPhase,
  elapsedSeconds,
  formatMissionClock,
  groundTrack,
  launchAzimuthDeg,
  missionEvents,
  subsolar,
  trackProgress,
} from '@/lib/mission'
import { GLOSSARY } from '@/lib/glossary'
import { findRocketPhoto } from '@/lib/rocket-photos'
import { formatMountain } from '@/lib/pro/time'
import { useActiveZone } from '@/components/use-zone'
import type { Launch } from '@/lib/types'
import { track } from '@/lib/track'

export function MissionShell({ launch, asOf }: { launch: Launch; asOf: string | null }) {
  const [family, setFamily] = useState(false)
  useEffect(() => {
    track('launch_day_opened')
  }, [])
  if (family) {
    return (
      <div className="mission-family">
        <button className="btn mission-switch" type="button" onClick={() => setFamily(false)}>
          Mission view
        </button>
        <LaunchDayScreen launch={launch} />
      </div>
    )
  }
  return <MissionView launch={launch} asOf={asOf} onFamily={() => setFamily(true)} />
}

function MissionView({ launch, asOf, onFamily }: { launch: Launch; asOf: string | null; onFamily: () => void }) {
  const zone = useActiveZone()
  const [now, setNow] = useState(() => Date.now())
  const [openEvent, setOpenEvent] = useState<string | null>(null)
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  const elapsed = elapsedSeconds(launch.net, now)
  const script = missionEvents(launch)
  const phase = currentPhase(script.events, elapsed)
  const clock = elapsed == null ? 'TBD' : formatMissionClock(elapsed)
  const inclination = approximateInclination(launch.orbitName, launch.orbitAbbrev, launch.padLat)
  const azimuth = launch.padLat != null ? launchAzimuthDeg(launch.padLat, inclination) : null
  const track =
    launch.padLat != null && launch.padLon != null && azimuth != null
      ? groundTrack(launch.padLat, launch.padLon, azimuth)
      : []
  const photo = findRocketPhoto(launch.rocketName)
  const payloads = launch.manifest.filter((item) => item.role === 'payload' || item.role === 'spacecraft')
  const payloadText = payloads.length
    ? payloads
        .slice(0, 3)
        .map((item) => (item.count && item.count > 1 ? `${item.count} ${item.name}` : item.name))
        .join(', ')
    : null
  const operators = [...new Set(payloads.map((item) => item.company).filter(Boolean))].join(', ')

  return (
    <main className="mission-screen">
      <div className="mission-top">
        <Link className="brand" href={`/launches/${launch.id}`}>
          <Logo />
          <span className="meta">Back</span>
        </Link>
        <div className="mission-clock-block">
          <p className="kicker" suppressHydrationWarning>
            {phase}
          </p>
          <p className="mission-clock" suppressHydrationWarning>
            {clock}
          </p>
          <p className="pro-time">{launch.net ? formatMountain(launch.net, zone) : 'Time not set'}</p>
        </div>
        <button className="btn mission-switch" type="button" onClick={onFamily}>
          Family view
        </button>
      </div>
      <div className="mission-grid">
        <aside className="mission-stats">
          <Stat label="Phase" value={phase} />
          {launch.orbitName || launch.orbitAbbrev ? <Stat label="Orbit" value={launch.orbitName ?? launch.orbitAbbrev ?? ''} /> : null}
        </aside>
        <div className="mission-center">
          <MissionGlobe track={track} progress={trackProgress(elapsed)} sun={subsolar(now)} />
        </div>
        <aside className="mission-cards">
          <article className="pro-card">
            <p className="kicker">Rocket</p>
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="mission-photo" src={photo.file} alt={photo.alt} />
            ) : (
              <span className="rocket-fallback">
                <Trail span="load" />
              </span>
            )}
            <p>{launch.rocketName}</p>
            {photo && asOf ? (
              <p className="meta">
                Photo by {photo.author}. {photo.license}. <a href={photo.sourceUrl}>Source</a>
                {' · as of '}
                {asOf}
              </p>
            ) : (
              <p className="meta">No openly licensed photo is on file.</p>
            )}
          </article>
          <article className="pro-card">
            <p className="kicker">Payload</p>
            {payloadText ? <FigureLine text={payloadText} /> : <p>No public figure yet</p>}
            {operators ? <p>{operators}</p> : null}
            {payloadText && asOf ? (
              <p className="meta">
                <a href="https://thespacedevs.com/llapi">Launch Library 2</a>
                {' · as of '}
                {asOf}
              </p>
            ) : null}
          </article>
        </aside>
      </div>
      <div className="mission-line">
        {!script.official ? <p className="kicker">Typical timeline, not official</p> : <p className="kicker">Public timeline</p>}
        <ol className="mission-events">
          {script.events.map((event) => {
            const key = `${event.abbrev}-${event.offsetSec}`
            const nowEvent = elapsed != null && event.abbrev === phase
            const folded = event.abbrev.toLowerCase()
            const term = GLOSSARY.find((item) => item.term.toLowerCase() === folded || item.id === folded.replace(/\s+/g, '-'))
            const explanation = term?.adult ?? event.description
            return (
              <li key={key} data-state={nowEvent ? 'now' : elapsed != null && event.offsetSec < elapsed ? 'past' : 'next'}>
                <span className="mission-dot" />
                <button
                  className="mission-label"
                  type="button"
                  aria-expanded={openEvent === key}
                  onClick={() => setOpenEvent(openEvent === key ? null : key)}
                >
                  {event.abbrev}
                </button>
                <span className="pro-time">{formatOffset(event.offsetSec)}</span>
                {openEvent === key ? <span className="mission-explain">{explanation}</span> : null}
              </li>
            )
          })}
        </ol>
      </div>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="kicker">{label}</p>
      <p className="mission-stat">{value}</p>
    </div>
  )
}

function formatOffset(seconds: number): string {
  const sign = seconds < 0 ? 'T−' : seconds > 0 ? 'T+' : 'T'
  const abs = Math.abs(seconds)
  const minutes = Math.floor(abs / 60)
  const remain = abs % 60
  if (seconds === 0) return 'T+ 0'
  if (minutes > 0 && remain === 0) return `${sign} ${minutes}m`
  if (minutes > 0) return `${sign} ${minutes}m ${remain}s`
  return `${sign} ${remain}s`
}
