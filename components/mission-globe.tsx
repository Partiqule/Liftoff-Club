import land from '@/lib/land-rings.json'
import type { TrackPoint } from '@/lib/mission'

type Sun = { lat: number; lon: number }

export function MissionGlobe({
  track,
  progress,
  sun,
}: {
  track: TrackPoint[]
  progress: number
  sun: Sun
}) {
  const pad = track[0] ?? { lat: 20, lon: -90 }
  const centerLon = pad.lon - 28
  const landPaths = (land as number[][][])
    .map((ring) => drawRing(ring, centerLon, sun))
    .filter((item): item is { key: string; d: string; lit: boolean } => Boolean(item))
  const paths = trackSegments(track, centerLon)
  const along = track[Math.min(track.length - 1, Math.round(progress * Math.max(0, track.length - 1)))]
  const dot = along ? project(along, centerLon) : null
  const sunPoint = project(sun, centerLon)
  const night = sunPoint ? { x: -sunPoint.x, y: -sunPoint.y } : { x: 40, y: -20 }
  return (
    <figure className="mission-globe">
      <svg viewBox="-120 -120 240 240" role="img" aria-label="Approximate path">
        <defs>
          <radialGradient id="mission-night" cx={night.x} cy={night.y} r="150" gradientUnits="userSpaceOnUse">
            <stop offset="0.15" stopColor="#07060f" stopOpacity="0.82" />
            <stop offset="0.55" stopColor="#07060f" stopOpacity="0.28" />
            <stop offset="0.82" stopColor="#07060f" stopOpacity="0" />
          </radialGradient>
          <clipPath id="mission-disk">
            <circle cx="0" cy="0" r="98" />
          </clipPath>
        </defs>
        <circle cx="0" cy="0" r="98" fill="#100e1c" />
        <g clipPath="url(#mission-disk)">
          {landPaths.map((item) => (
            <path key={item.key} d={item.d} fill={item.lit ? '#4a4368' : '#1c1830'} />
          ))}
          <circle cx="0" cy="0" r="98" fill="url(#mission-night)" />
          {paths.map((d, index) => (
            <path key={index} d={d} fill="none" stroke="#f3d7b0" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {dot ? <circle cx={dot.x} cy={dot.y} r="3.2" fill="#f6f3ec" /> : null}
        </g>
        <circle cx="0" cy="0" r="98" fill="none" stroke="rgba(197,210,226,0.35)" />
      </svg>
      <figcaption className="kicker">Approximate path</figcaption>
    </figure>
  )
}

function drawRing(ring: number[][], centerLon: number, sun: Sun): { key: string; d: string; lit: boolean } | null {
  let d = ''
  let drawing = false
  let latSum = 0
  let lonSum = 0
  let count = 0
  for (const pair of ring) {
    const point = project({ lon: pair[0], lat: pair[1] }, centerLon)
    latSum += pair[1]
    lonSum += pair[0]
    count += 1
    if (!point) {
      drawing = false
      continue
    }
    d += `${drawing ? 'L' : 'M'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`
    drawing = true
  }
  if (!d || count === 0) return null
  const lit = isLit(latSum / count, lonSum / count, sun)
  return { key: `${ring[0][0]}-${ring[0][1]}-${ring.length}`, d, lit }
}

function trackSegments(track: TrackPoint[], centerLon: number): string[] {
  const segments: string[] = []
  let current = ''
  for (const point of track) {
    const projected = project(point, centerLon)
    if (!projected) {
      if (current) segments.push(current)
      current = ''
      continue
    }
    current += `${current ? 'L' : 'M'}${projected.x.toFixed(1)} ${projected.y.toFixed(1)}`
  }
  if (current) segments.push(current)
  return segments
}

function project(point: TrackPoint, centerLon: number): { x: number; y: number } | null {
  const λ = ((point.lon - centerLon) * Math.PI) / 180
  const φ = (point.lat * Math.PI) / 180
  const x = Math.cos(φ) * Math.sin(λ)
  const y = Math.sin(φ)
  const z = Math.cos(φ) * Math.cos(λ)
  if (z < -0.02) return null
  return { x: x * 98, y: -y * 98 }
}

function isLit(lat: number, lon: number, sun: Sun): boolean {
  const φ1 = (lat * Math.PI) / 180
  const φ2 = (sun.lat * Math.PI) / 180
  const dλ = ((lon - sun.lon) * Math.PI) / 180
  const cos = Math.sin(φ1) * Math.sin(φ2) + Math.cos(φ1) * Math.cos(φ2) * Math.cos(dλ)
  return cos > 0
}
