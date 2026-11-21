'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { LocationPrompt } from '@/components/location-prompt'
import { SkyDome, type SkyDot } from '@/components/sky-dome'
import { formatAltitudeKm, formatSpeedKms, radarKindLabel } from '@/lib/radar'
import { useClub } from '@/components/club-provider'
import { compass8, heightPhrase } from '@/lib/geo'
import { watchingPlace } from '@/lib/places'
import {
  SKY_COPY,
  clampSkyZoom,
  compassNeedsTap,
  guideAngle,
  guidePhrase,
  readOrientation,
  riseMinutes,
  visibilityLabel,
  type OrientationRead,
  type SkyElement,
  type SkyFix,
  type SkyKind,
} from '@/lib/sky-point'
import type { SkyPass } from '@/lib/sky-propagate'

type Mode = 'checking' | 'tap' | 'on' | 'denied' | 'unavailable'
type CompassSupport = 'server' | 'missing' | 'tap' | 'listen'

type Row = SkyFix & { name: string; kind: SkyKind }

function compassSupport(): CompassSupport {
  if (typeof window === 'undefined' || !window.DeviceOrientationEvent) return 'missing'
  const ask = (window.DeviceOrientationEvent as unknown as { requestPermission?: unknown }).requestPermission
  const nav = navigator as Navigator & { userAgent?: string; platform?: string; maxTouchPoints?: number }
  return compassNeedsTap(ask, nav.userAgent || '', nav.platform || '', nav.maxTouchPoints || 0) ? 'tap' : 'listen'
}

export function SkyFinder() {
  const { settings, hydrated } = useClub()
  const place = watchingPlace(settings.location)
  const [catalog, setCatalog] = useState<{ objects: SkyElement[]; notice: string | null } | null>(null)
  const [catalogState, setCatalogState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [fixes, setFixes] = useState<SkyFix[]>([])
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [selected, setSelected] = useState<string | null>(null)
  const [skyView, setSkyView] = useState<'map' | 'compass'>('map')
  const [zoom, setZoom] = useState(1)
  const [detail, setDetail] = useState<{ id: string; pass: SkyPass } | null>(null)
  const setZoomSafe = useCallback((value: number) => setZoom(clampSkyZoom(value)), [])
  const support = useSyncExternalStore(subscribeCompass, compassSupport, () => 'server' as const)
  const [armed, setArmed] = useState(false)
  const [sensor, setSensor] = useState<'checking' | 'on' | 'denied' | 'unavailable'>('checking')
  const [reading, setReading] = useState<OrientationRead>({ heading: null, elevation: null, unreliable: false })
  const listenStop = useRef<(() => void) | null>(null)
  const mode: Mode =
    sensor === 'denied' || sensor === 'on' || sensor === 'unavailable'
      ? sensor
      : support === 'tap' && !armed
        ? 'tap'
        : support === 'missing'
          ? 'unavailable'
          : 'checking'

  useEffect(() => {
    let cancel = false
    ;(async () => {
      try {
        const response = await fetch('/api/sky/finder', { signal: AbortSignal.timeout(20_000) })
        if (!response.ok) throw new Error('orbits')
        const body = (await response.json()) as { objects?: unknown; notice?: unknown }
        if (cancel) return
        setCatalog({
          objects: Array.isArray(body.objects) ? body.objects.filter(isElement) : [],
          notice: typeof body.notice === 'string' ? body.notice : null,
        })
        setCatalogState('ready')
      } catch {
        if (!cancel) setCatalogState('error')
      }
    })()
    return () => {
      cancel = true
    }
  }, [])

  useEffect(() => {
    if (!place || !catalog) return
    let cancel = false
    let current: SkyFix[] = []
    let surveyed = false
    const run = async (full: boolean) => {
      const mod = await import('@/lib/sky-propagate')
      if (cancel) return
      const when = new Date()
      const next = full || !surveyed ? await mod.surveySky(catalog.objects, place, when, 30) : mod.refreshFixes(catalog.objects, current, place, when)
      if (cancel) return
      surveyed = true
      current = next
      setFixes(next)
      setNowMs(when.getTime())
    }
    void run(true)
    const fast = window.setInterval(() => void run(false), 1500)
    const slow = window.setInterval(() => void run(true), 30_000)
    return () => {
      cancel = true
      window.clearInterval(fast)
      window.clearInterval(slow)
    }
  }, [place, catalog])

  useEffect(() => {
    if (!place || !selected || !catalog) return
    const object = catalog.objects.find((item) => item.noradId === selected)
    if (!object) return
    let cancel = false
    const id = selected
    ;(async () => {
      const mod = await import('@/lib/sky-propagate')
      if (cancel) return
      const pass = mod.skyPass(object, place, new Date())
      if (!cancel && pass) setDetail({ id, pass })
    })()
    return () => {
      cancel = true
    }
  }, [place, selected, catalog])

  useEffect(() => {
    if (support === 'listen') listenStop.current = startListening(setReading, setSensor)
    return () => {
      listenStop.current?.()
      listenStop.current = null
    }
  }, [support])

  async function enableCompass() {
    const ctor = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }
    try {
      const result = await ctor.requestPermission?.()
      if (result && result !== 'granted') {
        setSensor('denied')
        return
      }
    } catch {
      setSensor('denied')
      return
    }
    setArmed(true)
    listenStop.current?.()
    listenStop.current = startListening(setReading, setSensor)
  }

  const rows = joinRows(fixes, catalog?.objects ?? [])
  const above = rows.filter((row) => row.above).sort((a, b) => Number(b.visible) - Number(a.visible) || b.elevation - a.elevation)
  const soon = rows.filter((row) => !row.above).sort((a, b) => (a.riseAt ?? 0) - (b.riseAt ?? 0))
  const picked = rows.find((row) => row.noradId === selected) ?? null
  const heading = mode === 'on' && !reading.unreliable ? reading.heading : null
  const cameraEl = mode === 'on' ? reading.elevation : null
  const phrase = picked
    ? guidePhrase({
        name: picked.name,
        heading,
        cameraElevation: cameraEl,
        azimuth: picked.azimuth,
        elevation: picked.elevation,
        above: picked.above,
        riseInMin: riseMinutes(picked.riseAt, nowMs),
        riseAzimuth: picked.riseAzimuth,
      })
    : null
  const angle =
    picked && heading != null
      ? guideAngle({
          heading,
          cameraElevation: cameraEl,
          azimuth: picked.azimuth,
          elevation: picked.elevation,
          above: picked.above,
          riseAzimuth: picked.riseAzimuth,
        })
      : null
  const dots = domeDots(above, selected, zoom)
  const notice = catalogState === 'error' ? SKY_COPY.loadFailed : catalog?.notice
  const headingForMap = skyView === 'compass' ? heading : null

  return (
    <section className="wrap page">
      <p className="kicker">{place ? place.label : SKY_COPY.pageKicker}</p>
      <h1>{SKY_COPY.pageTitle}</h1>
      <p className="lede">{SKY_COPY.pageLede}</p>
      <p className="meta">
        {SKY_COPY.creditBefore} <a href="https://celestrak.org">{SKY_COPY.creditName}</a>.
      </p>
      {!hydrated || (place && catalogState === 'loading') ? <p className="lede">{SKY_COPY.checking}</p> : null}
      {notice ? (
        <p className="banner" role="status">
          {notice}
        </p>
      ) : null}
      {hydrated && !place ? (
        <>
          <p className="lede">{SKY_COPY.needTown}</p>
          <LocationPrompt />
        </>
      ) : null}
      {place && catalogState !== 'loading' ? (
        <>
          {mode === 'tap' ? (
            <div className="hero-actions">
              <button className="btn" type="button" onClick={() => void enableCompass()}>
                {SKY_COPY.compassButton}
              </button>
            </div>
          ) : null}
          {mode === 'tap' ? <p className="note">{SKY_COPY.compassHelp}</p> : null}
          {mode === 'denied' ? <p className="note">{SKY_COPY.compassDenied}</p> : null}
          {mode === 'unavailable' ? <p className="note">{SKY_COPY.noCompass}</p> : null}
          {mode === 'on' && reading.unreliable ? (
            <p className="note" role="status">
              {SKY_COPY.figureEight}
            </p>
          ) : null}
          {phrase || rows.length > 0 ? (
            <p className={phrase ? 'sky-guide' : 'lede'} aria-live="polite">
              {phrase ?? SKY_COPY.tapOne}
            </p>
          ) : null}
          {angle == null ? null : (
            <div className="sky-dial" style={{ transform: `rotate(${angle}deg)` }} aria-hidden="true">
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="1" />
                <path d="M50 6 L43 22 L57 22 Z" fill="currentColor" />
              </svg>
            </div>
          )}
          <div className="sky-tools">
            <button type="button" aria-pressed={skyView === 'compass'} onClick={() => setSkyView('compass')}>
              {SKY_COPY.compassMode}
            </button>
            <button type="button" aria-pressed={skyView === 'map'} onClick={() => setSkyView('map')}>
              {SKY_COPY.mapMode}
            </button>
            <button type="button" onClick={() => setZoomSafe(zoom / 1.25)} aria-label={SKY_COPY.zoomOut}>
              {SKY_COPY.zoomOut}
            </button>
            <button type="button" onClick={() => setZoomSafe(zoom * 1.25)} aria-label={SKY_COPY.zoomIn}>
              {SKY_COPY.zoomIn}
            </button>
          </div>
          <p className="note">{SKY_COPY.skyGesture}</p>
          <SkyDome
            key={zoom > 1.01 ? 'zoomed' : 'flat'}
            dots={dots}
            path={detail?.id === selected ? detail.pass.path : []}
            heading={headingForMap}
            zoom={zoom}
            label={skyView === 'compass' ? SKY_COPY.compassNote : SKY_COPY.domeNote}
            onZoom={setZoomSafe}
            onPick={setSelected}
          />
          <p className="note">{skyView === 'compass' ? SKY_COPY.compassNote : SKY_COPY.domeNote}</p>
          {picked ? <SkyDetail row={picked} detail={detail?.id === picked.noradId ? detail.pass : null} nowMs={nowMs} /> : null}
          <SkyList title={SKY_COPY.aboveTitle} rows={above} selected={selected} nowMs={nowMs} empty={SKY_COPY.noneAbove} onPick={setSelected} />
          <SkyList title={SKY_COPY.soonTitle} rows={soon} selected={selected} nowMs={nowMs} empty={SKY_COPY.noneSoon} onPick={setSelected} />
        </>
      ) : null}
    </section>
  )
}

function SkyList({
  title,
  rows,
  selected,
  nowMs,
  empty,
  onPick,
}: {
  title: string
  rows: Row[]
  selected: string | null
  nowMs: number
  empty: string
  onPick: (id: string) => void
}) {
  return (
    <div className="sky-block">
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <p className="note">{empty}</p>
      ) : (
        <ul className="sky-list">
          {rows.map((row) => {
            const minutes = riseMinutes(row.riseAt, nowMs)
            const when = minutes == null ? null : minutes <= 1 ? 'within a minute' : `in ${minutes} min`
            const detail = row.above
              ? `${heightPhrase(row.elevation)}, toward the ${compass8(row.azimuth)} · ${visibilityLabel(row.visible, row.illuminated)}`
              : `Rises ${when ?? 'soon'} toward the ${compass8(row.riseAzimuth ?? row.azimuth)} · ${visibilityLabel(row.visibleAtRise, row.litAtRise)}`
            return (
              <li key={row.noradId}>
                <button className="sky-row" type="button" aria-pressed={selected === row.noradId} onClick={() => onPick(row.noradId)}>
                  <span>
                    <span className="sky-name">{row.name}</span>
                    <span className="meta">{detail}</span>
                  </span>
                  {row.above ? <span className="sky-figure">{Math.round(row.elevation)}°</span> : null}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function domeDots(above: Row[], selected: string | null, zoom: number): SkyDot[] {
  const labeled = new Set<string>()
  const cap = zoom >= 2.2 ? 24 : zoom >= 1.4 ? 14 : 8
  for (const row of above) {
    if (row.noradId === selected || row.name === 'ISS' || row.name === 'Tiangong' || row.name === 'Hubble') labeled.add(row.noradId)
  }
  for (const row of above) {
    if (labeled.size >= cap) break
    if (row.visible) labeled.add(row.noradId)
  }
  return above.map((row) => ({
    id: row.noradId,
    name: row.name,
    azimuth: row.azimuth,
    elevation: row.elevation,
    visible: row.visible,
    selected: row.noradId === selected,
    showLabel: labeled.has(row.noradId),
  }))
}

function SkyDetail({ row, detail, nowMs }: { row: Row; detail: SkyPass | null; nowMs: number }) {
  const rise = riseMinutes(row.above ? null : (detail?.riseAt ?? row.riseAt), nowMs)
  const set = riseMinutes(row.above ? (detail?.setAt ?? null) : null, nowMs)
  const riseDir = compass8(detail?.riseAzimuth ?? row.riseAzimuth ?? row.azimuth)
  const setDir = compass8(detail?.setAzimuth ?? row.azimuth)
  const when = row.above
    ? set
      ? `Sets in ${set} min toward the ${setDir}.`
      : `Toward the ${compass8(row.azimuth)}, ${Math.round(row.elevation)}° up.`
    : `Rises ${rise == null ? 'soon' : rise <= 1 ? 'within a minute' : `in ${rise} min`} toward the ${riseDir}.`
  return (
    <div className="radar-card" aria-live="polite">
      <p className="kicker">{radarKindLabel(row.kind)}</p>
      <p className="radar-name">{row.name}</p>
      <p className="radar-figure">
        <span>{SKY_COPY.altitude}</span>
        {detail ? formatAltitudeKm(detail.altKm) : 'checking'}
      </p>
      <p className="radar-figure">
        <span>{SKY_COPY.speed}</span>
        {detail ? formatSpeedKms(detail.speedKms) : 'checking'}
      </p>
      <p className="meta">
        {SKY_COPY.direction}: {heightPhrase(row.elevation)}, toward the {compass8(row.azimuth)}.
      </p>
      <p className="meta">{when}</p>
      <p className="meta">{SKY_COPY.pathLabel}</p>
    </div>
  )
}

function joinRows(fixes: SkyFix[], objects: SkyElement[]): Row[] {
  const byId = new Map(objects.map((object) => [object.noradId, object]))
  return fixes.flatMap((fix) => {
    const object = byId.get(fix.noradId)
    if (!object) return []
    return [{ ...fix, name: object.name, kind: object.kind }]
  })
}

function isElement(value: unknown): value is SkyElement {
  if (!value || typeof value !== 'object') return false
  const row = value as Partial<SkyElement>
  return (
    typeof row.noradId === 'string' &&
    typeof row.name === 'string' &&
    (row.kind === 'station' || row.kind === 'hubble' || row.kind === 'bright' || row.kind === 'starlink') &&
    typeof row.line1 === 'string' &&
    row.line1.startsWith('1 ') &&
    typeof row.line2 === 'string' &&
    row.line2.startsWith('2 ')
  )
}

function subscribeCompass() {
  return () => {}
}

function startListening(
  setReading: (reading: OrientationRead) => void,
  setSensor: (sensor: 'on' | 'unavailable') => void,
): () => void {
  let sawHeading = false
  const latest: { current: OrientationRead | null } = { current: null }
  const onEvent = (event: DeviceOrientationEvent, absoluteEvent: boolean) => {
    const extra = event as DeviceOrientationEvent & { webkitCompassHeading?: number; webkitCompassAccuracy?: number }
    const read = readOrientation(
      {
        alpha: event.alpha,
        beta: event.beta,
        gamma: event.gamma,
        absolute: event.absolute,
        webkitCompassHeading: typeof extra.webkitCompassHeading === 'number' ? extra.webkitCompassHeading : null,
        webkitCompassAccuracy: typeof extra.webkitCompassAccuracy === 'number' ? extra.webkitCompassAccuracy : null,
      },
      absoluteEvent,
    )
    latest.current = read
    if (read.heading != null && !sawHeading) {
      sawHeading = true
      setSensor('on')
    }
  }
  const onAbsolute = (event: Event) => onEvent(event as DeviceOrientationEvent, true)
  const onRelative = (event: Event) => onEvent(event as DeviceOrientationEvent, false)
  window.addEventListener('deviceorientationabsolute', onAbsolute)
  window.addEventListener('deviceorientation', onRelative)
  const flush = window.setInterval(() => {
    if (latest.current) setReading(latest.current)
  }, 200)
  const giveUp = window.setTimeout(() => {
    if (!sawHeading) setSensor('unavailable')
  }, 2500)
  return () => {
    window.removeEventListener('deviceorientationabsolute', onAbsolute)
    window.removeEventListener('deviceorientation', onRelative)
    window.clearInterval(flush)
    window.clearTimeout(giveUp)
  }
}
