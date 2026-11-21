'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { useClub } from '@/components/club-provider'
import {
  EARTH_STILL,
  RADAR_COPY,
  capRadarObjects,
  elementsFromTleBundle,
  formatAltitudeKm,
  formatSpeedKms,
  observerDot,
  radarKindLabel,
  type RadarFix,
  type RadarLaunch,
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
  const place = observerDot(watchingPlace(settings.location))
  const reduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia('(prefers-reduced-motion: reduce)').matches, () => false)
  const [objects, setObjects] = useState<SkyElement[]>([])
  const [note, setNote] = useState<string>(RADAR_COPY.loading)
  const [live, setLive] = useState(false)
  const [failed, setFailed] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [picked, setPicked] = useState<RadarFix | null>(null)

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

  const choose = (id: string | null) => {
    setSelectedId(id)
    if (!id) setPicked(null)
  }

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
            launch={launch}
            reduced={reduced}
            selectedId={selectedId}
            onSelect={choose}
            onFix={onFix}
            onLive={() => setLive(true)}
            onFallback={() => setFailed(true)}
          />
        )}
      </div>
      <p className="meta radar-gesture">{RADAR_COPY.gesture}</p>
      {failed ? <p className="note">{RADAR_COPY.fallback}</p> : null}
      {note ? <p className="note">{note}</p> : <p className="meta">{RADAR_COPY.legend}</p>}
      {launch ? (
        <p className="meta">
          {RADAR_COPY.next}: {launch.name}. {RADAR_COPY.path} {launch.padName}.
        </p>
      ) : null}
      {picked ? (
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
        {objects.map((object) => (
          <li key={object.noradId}>
            <button type="button" onClick={() => choose(object.noradId)}>
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
