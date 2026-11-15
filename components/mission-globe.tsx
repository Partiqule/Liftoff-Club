import type { TrackPoint } from '@/lib/mission'

export function MissionGlobe({
  track,
  progress,
}: {
  track: TrackPoint[]
  progress: number
}) {
  const center = track[0] ?? { lat: 0, lon: 0 }
  const projected = track
    .map((point) => project(point, center.lon))
    .filter((point): point is { x: number; y: number } => Boolean(point))
  const dotSource = track[Math.min(track.length - 1, Math.round(progress * Math.max(0, track.length - 1)))]
  const dot = dotSource ? project(dotSource, center.lon) : null
  const path = projected.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ')
  return (
    <figure className="mission-globe">
      <svg viewBox="-120 -120 240 240" role="img" aria-label="Approximate path">
        <circle cx="0" cy="0" r="98" fill="#07060f" stroke="rgba(197,210,226,0.35)" />
        <ellipse cx="0" cy="0" rx="98" ry="32" fill="none" stroke="rgba(197,210,226,0.18)" />
        <ellipse cx="0" cy="0" rx="32" ry="98" fill="none" stroke="rgba(197,210,226,0.18)" />
        <path d="M-98 0H98M0-98V98" stroke="rgba(197,210,226,0.12)" />
        {path ? <path d={path} fill="none" stroke="#f3d7b0" strokeWidth="1.4" /> : null}
        {dot ? <circle cx={dot.x} cy={dot.y} r="3.2" fill="#f6f3ec" /> : null}
      </svg>
      <figcaption className="kicker">Approximate path</figcaption>
    </figure>
  )
}

function project(point: TrackPoint, centerLon: number): { x: number; y: number } | null {
  const λ = ((point.lon - centerLon) * Math.PI) / 180
  const φ = (point.lat * Math.PI) / 180
  const x = Math.cos(φ) * Math.sin(λ)
  const y = Math.sin(φ)
  const z = Math.cos(φ) * Math.cos(λ)
  if (z < -0.05) return null
  return { x: x * 98, y: -y * 98 }
}
