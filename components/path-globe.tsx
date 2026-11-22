'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { pointAlong } from '@/lib/mission'
import { ORBIT_UI } from '@/lib/orbit-pattern'
import { EARTH_STILL, FITTED_DISTANCE, RADAR_COPY, type RadarOverlay, type RadarTarget } from '@/lib/radar'

const RadarScene = dynamic(() => import('@/components/radar-scene').then((mod) => mod.RadarScene), { ssr: false })

function subscribeReduced(onChange: () => void) {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

export const PATH_COPY = {
  kicker: 'Approximate path',
  explanation: 'A sketch of the ground track leaving the pad. It is not a live position, altitude, or speed.',
  pathDetail: 'The line is a rough ground track for the first part of the climb. The real path can differ.',
  padDetail: 'The path starts at this pad.',
  nowTitle: 'Along the sketch',
  nowDetail: 'A mark on the sketch after liftoff. It is not a tracked position.',
  missing: 'The pad position is not listed, so there is no path to draw.',
  legendPath: 'Approximate path',
  legendPad: 'Pad',
  legendNow: 'Along the sketch',
} as const

export function PathGlobe({
  track,
  pad,
  progress,
}: {
  track: { lat: number; lon: number }[]
  pad: { lat: number; lon: number; name: string } | null
  progress: number
}) {
  const rootRef = useRef<HTMLElement>(null)
  const [near, setNear] = useState(false)
  const [live, setLive] = useState(false)
  const [failed, setFailed] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [engaged, setEngaged] = useState(false)
  const reduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia('(prefers-reduced-motion: reduce)').matches, () => false)
  const focus = pad ?? track[0] ?? { lat: 28.6, lon: -80.6 }
  const along = track.length > 1 ? pointAlong(track, progress) : null
  const showNow = Boolean(along && progress > 0.02)
  const overlay: RadarOverlay = {
    chains: track.length > 1 ? [{ id: 'path', color: '#f3d7b0', points: track.map((point) => ({ ...point, radius: 1 })) }] : [],
    marks: [
      ...(pad ? [{ id: 'pad', lat: pad.lat, lon: pad.lon, shape: 'diamond' as const }] : []),
      ...(showNow && along ? [{ id: 'now', lat: along.lat, lon: along.lon }] : []),
    ],
  }
  const card = detailFor(selected, pad?.name ?? 'Pad')

  useEffect(() => {
    const node = rootRef.current
    if (!node) return
    const watcher = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { rootMargin: '200px' })
    watcher.observe(node)
    return () => watcher.disconnect()
  }, [])

  return (
    <figure className="orbit-block path-globe" ref={rootRef}>
      <p className="kicker">{PATH_COPY.kicker}</p>
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
            focus={focus}
            distance={FITTED_DISTANCE}
            ariaLabel={`${PATH_COPY.kicker}. ${ORBIT_UI.gesture}`}
            onSelect={(target) => setSelected(fromTarget(target))}
            onFix={() => undefined}
            onLive={() => setLive(true)}
            onFallback={() => setFailed(true)}
            onEngagedChange={setEngaged}
          />
        ) : null}
      </div>
      <figcaption>
        <p>{pad ? PATH_COPY.explanation : PATH_COPY.missing}</p>
      </figcaption>
      <ul className="radar-legend">
        <li>
          <i style={{ background: '#f3d7b0' }} />
          {PATH_COPY.legendPath}
        </li>
        <li>
          <i className="path-pad" />
          {PATH_COPY.legendPad}
        </li>
        {showNow ? (
          <li>
            <i style={{ background: '#f6f3ec' }} />
            {PATH_COPY.legendNow}
          </li>
        ) : null}
      </ul>
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
          <button className="btn btn-quiet" type="button" onClick={() => setSelected('path')}>
            {PATH_COPY.legendPath}
          </button>
        </li>
        {pad ? (
          <li>
            <button className="btn btn-quiet" type="button" onClick={() => setSelected('pad')}>
              {pad.name}
            </button>
          </li>
        ) : null}
        {showNow ? (
          <li>
            <button className="btn btn-quiet" type="button" onClick={() => setSelected('now')}>
              {PATH_COPY.legendNow}
            </button>
          </li>
        ) : null}
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

function detailFor(selected: string | null, padName: string): { kicker: string; title: string; body: string } | null {
  if (!selected) return null
  if (selected === 'earth') return { kicker: ORBIT_UI.earthTitle, title: 'Earth', body: ORBIT_UI.earthDetail }
  if (selected === 'pad') return { kicker: PATH_COPY.legendPad, title: padName, body: PATH_COPY.padDetail }
  if (selected === 'now') return { kicker: PATH_COPY.kicker, title: PATH_COPY.nowTitle, body: PATH_COPY.nowDetail }
  if (selected === 'path') return { kicker: PATH_COPY.kicker, title: PATH_COPY.kicker, body: PATH_COPY.pathDetail }
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
