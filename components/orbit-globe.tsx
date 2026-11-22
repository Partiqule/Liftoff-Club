'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { EARTH_STILL, RADAR_COPY, type RadarOverlay, type RadarTarget } from '@/lib/radar'
import {
  ORBIT_UI,
  buildOrbitPattern,
  formatHeight,
  formatTilt,
  type OrbitPattern,
  type OrbitSpec,
} from '@/lib/orbit-pattern'

const RadarScene = dynamic(() => import('@/components/radar-scene').then((mod) => mod.RadarScene), { ssr: false })

function subscribeReduced(onChange: () => void) {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

export function OrbitGlobe({
  spec,
  ascent = null,
}: {
  spec: OrbitSpec
  /** Approximate climb from the pad, drawn in addition to the orbit pattern. */
  ascent?: { lat: number; lon: number }[] | null
}) {
  const pattern = buildOrbitPattern(spec)
  const rootRef = useRef<HTMLElement>(null)
  const [near, setNear] = useState(false)
  const [live, setLive] = useState(false)
  const [failed, setFailed] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [engaged, setEngaged] = useState(false)
  const reduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia('(prefers-reduced-motion: reduce)').matches, () => false)
  const overlay = overlayFor(pattern, ascent)
  const card = detailFor(pattern, selected, Boolean(ascent && ascent.length > 2))

  useEffect(() => {
    const node = rootRef.current
    if (!node) return
    const watcher = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { rootMargin: '240px' })
    watcher.observe(node)
    return () => watcher.disconnect()
  }, [])

  return (
    <figure className="orbit-block" ref={rootRef}>
      <p className="kicker">{pattern.label}</p>
      <div className={live && !failed ? 'radar-stage is-live' : 'radar-stage'}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="radar-still" src={EARTH_STILL} alt={RADAR_COPY.stillAlt} decoding="async" />
        {(near || engaged) && !failed ? (
          <RadarScene
            objects={[]}
            place={null}
            launch={null}
            timeZone={null}
            reduced={reduced}
            selected={toTarget(selected)}
            overlay={overlay}
            focus={pattern.focus}
            distance={pattern.distance}
            ariaLabel={`${pattern.label}. ${ORBIT_UI.gesture}`}
            onSelect={(target) => setSelected(fromTarget(target))}
            onFix={() => undefined}
            onLive={() => setLive(true)}
            onFallback={() => setFailed(true)}
            onEngagedChange={setEngaged}
          />
        ) : null}
      </div>
      <figcaption>
        <p>{pattern.explanation}</p>
        <p className="radar-figure">
          <span>{ORBIT_UI.tiltLabel}</span>
          {formatTilt(pattern)}
        </p>
        <p className="radar-figure">
          <span>{ORBIT_UI.heightLabel}</span>
          {formatHeight(pattern)}
        </p>
      </figcaption>
      <p className="meta radar-gesture">{engaged ? ORBIT_UI.engaged : ORBIT_UI.gesture}</p>
      {failed ? <p className="note">{RADAR_COPY.fallback}</p> : null}
      {card ? (
        <div className="radar-card" aria-live="polite">
          <p className="kicker">{card.kicker}</p>
          <p className="radar-name">{card.title}</p>
          <p>{card.body}</p>
          <button className="btn btn-quiet" type="button" onClick={() => setSelected(null)}>
            {ORBIT_UI.close}
          </button>
        </div>
      ) : null}
      <ul className="orbit-taps">
        <li>
          <button className="btn btn-quiet" type="button" onClick={() => setSelected(pattern.chains[0]?.id ?? 'path')}>
            {pattern.label}
          </button>
        </li>
        {ascent && ascent.length > 2 ? (
          <li>
            <button className="btn btn-quiet" type="button" onClick={() => setSelected('ascent')}>
              {ORBIT_UI.ascentTitle}
            </button>
          </li>
        ) : null}
        {pattern.marks.map((mark) => (
          <li key={mark.id}>
            <button className="btn btn-quiet" type="button" onClick={() => setSelected(mark.id)}>
              {mark.label}
            </button>
          </li>
        ))}
        <li>
          <button className="btn btn-quiet" type="button" onClick={() => setSelected('earth')}>
            {ORBIT_UI.earthTitle}
          </button>
        </li>
      </ul>
      <p className="meta">{ORBIT_UI.credit}</p>
    </figure>
  )
}

function overlayFor(pattern: OrbitPattern, ascent: { lat: number; lon: number }[] | null): RadarOverlay {
  const chains = pattern.chains.map((chain) => ({
    id: chain.id,
    color: chain.color,
    points: chain.points,
  }))
  if (ascent && ascent.length > 2) {
    chains.push({
      id: 'ascent',
      color: '#c5d2e2',
      points: ascent.map((point) => ({ ...point, radius: 1 })),
    })
  }
  return {
    chains,
    marks: pattern.marks.map((mark) => ({
      id: mark.id,
      lat: mark.lat,
      lon: mark.lon,
      radius: mark.radius,
      shape: mark.shape,
      canvas: mark.canvas,
      side: mark.side,
    })),
    traceMs: pattern.traceMs,
  }
}

function detailFor(pattern: OrbitPattern, selected: string | null, hasAscent: boolean): { kicker: string; title: string; body: string } | null {
  if (!selected) return null
  if (selected === 'earth') return { kicker: ORBIT_UI.earthTitle, title: 'Earth', body: ORBIT_UI.earthDetail }
  if (selected === 'ascent' && hasAscent) return { kicker: 'Path', title: ORBIT_UI.ascentTitle, body: ORBIT_UI.ascentDetail }
  const mark = pattern.marks.find((item) => item.id === selected)
  if (mark) return { kicker: pattern.label, title: mark.label, body: mark.detail }
  if (pattern.chains.some((chain) => chain.id === selected)) {
    return { kicker: pattern.label, title: pattern.label, body: pattern.detail || pattern.explanation }
  }
  return null
}

function toTarget(selected: string | null): RadarTarget | null {
  if (!selected) return null
  if (selected === 'earth') return { type: 'earth' }
  return { type: 'orbit', id: selected }
}

function fromTarget(target: RadarTarget | null): string | null {
  if (!target) return null
  if (target.type === 'earth') return 'earth'
  if (target.type === 'orbit') return target.id
  return null
}
