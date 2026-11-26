'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { useClub } from '@/components/club-provider'
import { useActiveZone } from '@/components/use-zone'
import { homeLegendShowsSatellite, legendKeepsTarget, type HomeLegend } from '@/lib/globe-share'
import {
  EARTH_STILL,
  RADAR_COPY,
  capRadarObjects,
  elementsFromTleBundle,
  formatAltitudeKm,
  formatSpeedKms,
  launchPhase,
  observerDot,
  pathCaption,
  radarKindLabel,
  type RadarFix,
  type RadarLaunch,
  type RadarTarget,
} from '@/lib/radar'
import { watchingPlace } from '@/lib/places'
import type { SkyElement } from '@/lib/sky-point'

const RadarScene = dynamic(() => import('@/components/radar-scene').then((mod) => mod.RadarScene), { ssr: false })

function subscribeReduced(onChange: () => void) {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

export function FlightRadar({ launch }: { launch: RadarLaunch | null }) {
  const { settings } = useClub()
  const zone = useActiveZone()
  const place = observerDot(watchingPlace(settings.location))
  const [now, setNow] = useState(() => Date.now())
  const reduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia('(prefers-reduced-motion: reduce)').matches, () => false)
  const [objects, setObjects] = useState<SkyElement[]>([])
  const [note, setNote] = useState<string>(RADAR_COPY.loading)
  const [live, setLive] = useState(false)
  const [failed, setFailed] = useState(false)
  const [selected, setSelected] = useState<RadarTarget | null>(null)
  const [engaged, setEngaged] = useState(false)
  const [picked, setPicked] = useState<RadarFix | null>(null)
  const [legend, setLegend] = useState<HomeLegend | null>(null)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 5000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    ;(async () => {
      try {
        const response = await fetch('/api/sky/finder', { signal: controller.signal })
        if (!response.ok) throw new Error('finder')
        const catalog = (await response.json()) as { objects?: SkyElement[] }
        let list = Array.isArray(catalog.objects) ? catalog.objects : []
        if (list.length === 0) {
          const tleResponse = await fetch('/api/sky/tles', { signal: controller.signal })
          if (tleResponse.ok) {
            const bundle = (await tleResponse.json()) as Parameters<typeof elementsFromTleBundle>[0]
            list = elementsFromTleBundle(bundle)
          }
        }
        if (controller.signal.aborted) return
        const capped = capRadarObjects(list)
        setObjects(capped)
        setNote(capped.length === 0 ? RADAR_COPY.empty : '')
      } catch (error) {
        if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) return
        setNote(RADAR_COPY.loadError)
      }
    })()
    return () => controller.abort()
  }, [])

  const onFix = useCallback((fix: RadarFix | null) => {
    setPicked((current) => {
      if (!fix) return current ? null : current
      if (
        current &&
        current.noradId === fix.noradId &&
        Math.abs(current.altKm - fix.altKm) < 0.05 &&
        Math.abs(current.speedKms - fix.speedKms) < 0.005
      ) {
        return current
      }
      return fix
    })
  }, [])

  const choose = (target: RadarTarget | null) => {
    setSelected(target)
    if (target?.type !== 'sat') setPicked(null)
  }

  const pickLegend = (next: HomeLegend) => {
    const value = legend === next ? null : next
    setLegend(value)
    setSelected((current) => {
      if (legendKeepsTarget(value, current, (id) => objects.find((item) => item.noradId === id)?.kind ?? null)) return current
      return null
    })
    setPicked((current) => {
      if (!value || value === 'you') return value ? null : current
      return current && current.kind === value ? current : null
    })
  }

  const phase = launch ? launchPhase(launch, now) : 'flown'
  const caption = launch ? pathCaption(launch, phase) : null
  const showLaunch = Boolean(launch && phase !== 'flown')

  return (
    <section className="radar-hero wrap" aria-label={RADAR_COPY.kicker}>
      <p className="kicker">{RADAR_COPY.kicker}</p>
      <div className={live && !failed ? 'radar-stage is-live' : 'radar-stage'}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="radar-still" src={EARTH_STILL} alt={RADAR_COPY.stillAlt} fetchPriority="high" decoding="async" />
        {failed ? null : (
          <RadarScene
            objects={objects}
            place={place}
            launch={showLaunch ? launch : null}
            timeZone={zone}
            reduced={reduced}
            selected={selected}
            onSelect={choose}
            onFix={onFix}
            onLive={() => setLive(true)}
            onFallback={() => setFailed(true)}
            onEngagedChange={setEngaged}
            legend={legend}
          />
        )}
      </div>
      <p className="meta radar-gesture">{engaged ? RADAR_COPY.engaged : RADAR_COPY.gesture}</p>
      {failed ? <p className="note">{RADAR_COPY.fallback}</p> : null}
      {live || failed ? null : <p className="note">{RADAR_COPY.drawing}</p>}
      {note ? <p className="note">{note}</p> : null}
      <ul className="radar-legend" aria-label="Colors on the globe">
        <li>
          <button type="button" aria-pressed={legend === 'station'} onClick={() => pickLegend('station')}>
            <i style={{ background: '#f3d7b0' }} />
            {RADAR_COPY.legendStations}
          </button>
        </li>
        <li>
          <button type="button" aria-pressed={legend === 'starlink'} onClick={() => pickLegend('starlink')}>
            <i style={{ background: '#b7aec8' }} />
            {RADAR_COPY.legendTrains}
          </button>
        </li>
        <li>
          <button type="button" aria-pressed={legend === 'bright'} onClick={() => pickLegend('bright')}>
            <i style={{ background: '#c5d2e2' }} />
            {RADAR_COPY.legendBright}
          </button>
        </li>
        <li>
          <button type="button" aria-pressed={legend === 'you'} onClick={() => pickLegend('you')}>
            <i className="radar-you" />
            {RADAR_COPY.legendYou}
          </button>
        </li>
      </ul>
      {legend ? (
        <button className="btn btn-quiet" type="button" onClick={() => pickLegend(legend)}>
          {RADAR_COPY.showAll}
        </button>
      ) : null}
      {legend ? <p className="sr-only" aria-live="polite">{legendStatus(legend)}</p> : null}
      {caption && launch ? (
        <p className="meta radar-path">
          {caption}. {RADAR_COPY.path} {launch.padName}.
        </p>
      ) : null}
      {selected?.type === 'you' ? (
        <div className="radar-card" aria-live="polite">
          <p className="kicker">{RADAR_COPY.legendYou}</p>
          <p className="radar-name">{settings.location?.label || RADAR_COPY.legendYou}</p>
          <p className="meta">{RADAR_COPY.youNote}</p>
          <button className="btn btn-quiet" type="button" onClick={() => choose(null)}>
            {RADAR_COPY.close}
          </button>
        </div>
      ) : selected?.type === 'pad' || selected?.type === 'path' ? (
        <div className="radar-card" aria-live="polite">
          <p className="kicker">{selected.type === 'pad' ? RADAR_COPY.padLabel : RADAR_COPY.next}</p>
          <p className="radar-name">{launch?.name}</p>
          <p className="meta">
            {launch?.padName}. {caption}.
          </p>
          <button className="btn btn-quiet" type="button" onClick={() => choose(null)}>
            {RADAR_COPY.close}
          </button>
        </div>
      ) : picked ? (
        <div className="radar-card" aria-live="polite">
          <p className="kicker">{radarKindLabel(picked.kind)}</p>
          <p className="radar-name">{picked.name}</p>
          <p className="radar-figure">
            <span>{RADAR_COPY.altitude}</span>
            {formatAltitudeKm(picked.altKm)}
          </p>
          <p className="radar-figure">
            <span>{RADAR_COPY.speed}</span>
            {formatSpeedKms(picked.speedKms)}
          </p>
          <p className="meta">{RADAR_COPY.orbit}</p>
          <button className="btn btn-quiet" type="button" onClick={() => choose(null)}>
            {RADAR_COPY.close}
          </button>
        </div>
      ) : (
        <p className="meta">{RADAR_COPY.hint}</p>
      )}
      <ul className="sr-only">
        {objects.filter((object) => homeLegendShowsSatellite(legend, object.kind)).map((object) => (
          <li key={object.noradId}>
            <button type="button" onClick={() => choose({ type: 'sat', id: object.noradId })}>
              {object.name}
            </button>
          </li>
        ))}
      </ul>
      <p className="meta">
        {RADAR_COPY.creditBefore} <a href="https://celestrak.org">{RADAR_COPY.creditName}</a>.
      </p>
    </section>
  )
}

function legendStatus(legend: HomeLegend): string {
  if (legend === 'station') return RADAR_COPY.legendShowingStations
  if (legend === 'starlink') return RADAR_COPY.legendShowingTrains
  if (legend === 'bright') return RADAR_COPY.legendShowingBright
  return RADAR_COPY.legendShowingYou
}
