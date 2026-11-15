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
  return (
    <figure className="mission-globe">
      <svg viewBox="-120 -120 240 240" role="img" aria-label="Approximate path">
        <defs>
          <clipPath id="mission-disk">
            <circle cx="0" cy="0" r="98" />
          </clipPath>
        </defs>
        <circle cx="0" cy="0" r="98" fill="#100e1c" />
        <g clipPath="url(#mission-disk)">
          {landPaths.map((item) => (
            <path key={item.key} d={item.d} fill={item.lit ? '#4a4368' : '#1c1830'} />
          ))}
          <path d={nightPath(sun, centerLon)} fill="#07060f" opacity="0.55" />
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

type Vec = { x: number; y: number; z: number }

function drawRing(ring: number[][], centerLon: number, sun: Sun): { key: string; d: string; lit: boolean } | null {
  const vecs = ring.map((pair) => toVec({ lon: pair[0], lat: pair[1] }, centerLon))
  if (vecs.length > 2) vecs.push(vecs[0])
  const chains = clipChains(vecs)
  if (chains.length === 0) return null
  const d = chains.map((chain) => closeOnLimb(chain)).join(' ')
  const front = vecs.filter((item) => item.z >= 0)
  const sample = front[0] ?? vecs[0]
  const lit = isLitVec(sample, toVec(sun, centerLon))
  return { key: `${ring[0][0]}-${ring[0][1]}-${ring.length}`, d, lit }
}

function trackSegments(track: TrackPoint[], centerLon: number): string[] {
  const vecs = track.map((point) => toVec(point, centerLon))
  return clipChains(vecs).map((chain) => chain.map((item, index) => `${index ? 'L' : 'M'}${sx(item)} ${sy(item)}`).join(''))
}

function clipChains(vecs: Vec[]): Vec[][] {
  const chains: Vec[][] = []
  let chain: Vec[] = []
  for (let index = 0; index < vecs.length - 1; index += 1) {
    const a = vecs[index]
    const b = vecs[index + 1]
    const aFront = a.z >= 0
    const bFront = b.z >= 0
    if (aFront && bFront) {
      if (chain.length === 0 || chain[chain.length - 1] !== a) chain.push(a)
      chain.push(b)
    } else if (aFront && !bFront) {
      if (chain.length === 0) chain.push(a)
      chain.push(crossZero(a, b))
      chains.push(chain)
      chain = []
    } else if (!aFront && bFront) {
      chain = [crossZero(a, b)]
    }
  }
  if (chain.length > 1) chains.push(chain)
  return chains
}

function closeOnLimb(chain: Vec[]): string {
  let d = chain.map((item, index) => `${index ? 'L' : 'M'}${sx(item)} ${sy(item)}`).join('')
  const start = chain[0]
  const end = chain[chain.length - 1]
  if (chain.length > 2 && Math.abs(start.z) < 0.05 && Math.abs(end.z) < 0.05) {
    for (const point of limbArc(end, start, centroid(chain))) {
      d += `L${sx(point)} ${sy(point)}`
    }
    d += 'Z'
  }
  return d
}

function nightPath(sun: Sun, centerLon: number): string {
  const s = toVec(sun, centerLon)
  const ortho = Math.abs(s.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 }
  const u = norm(cross(ortho, s))
  const v = norm(cross(s, u))
  const circle: Vec[] = []
  for (let index = 0; index <= 96; index += 1) {
    const angle = (index / 96) * Math.PI * 2
    circle.push({
      x: Math.cos(angle) * u.x + Math.sin(angle) * v.x,
      y: Math.cos(angle) * u.y + Math.sin(angle) * v.y,
      z: Math.cos(angle) * u.z + Math.sin(angle) * v.z,
    })
  }
  const front = clipChains(circle)[0]
  if (!front || front.length < 2) return ''
  let d = front.map((item, index) => `${index ? 'L' : 'M'}${sx(item)} ${sy(item)}`).join('')
  for (const point of limbArc(front[front.length - 1], front[0], { x: -s.x, y: -s.y, z: -s.z })) {
    d += `L${sx(point)} ${sy(point)}`
  }
  return `${d}Z`
}

function limbArc(from: Vec, to: Vec, toward: Vec): Vec[] {
  const a0 = Math.atan2(from.y, from.x)
  const a1 = Math.atan2(to.y, to.x)
  const turn = (delta: number) => {
    const steps = Math.max(2, Math.ceil(Math.abs(delta) / (Math.PI / 24)))
    const points: Vec[] = []
    for (let step = 1; step <= steps; step += 1) {
      const angle = a0 + (delta * step) / steps
      points.push({ x: Math.cos(angle), y: Math.sin(angle), z: 0 })
    }
    return points
  }
  let cw = a1 - a0
  if (cw > Math.PI) cw -= Math.PI * 2
  if (cw < -Math.PI) cw += Math.PI * 2
  const ccw = cw > 0 ? cw - Math.PI * 2 : cw + Math.PI * 2
  const mid = (delta: number) => {
    const angle = a0 + delta / 2
    return { x: Math.cos(angle), y: Math.sin(angle), z: 0 }
  }
  const dist = (point: Vec) => (point.x - toward.x) ** 2 + (point.y - toward.y) ** 2
  return dist(mid(cw)) < dist(mid(ccw)) ? turn(cw) : turn(ccw)
}

function centroid(chain: Vec[]): Vec {
  const total = chain.reduce((sum, item) => ({ x: sum.x + item.x, y: sum.y + item.y, z: sum.z + item.z }), { x: 0, y: 0, z: 0 })
  return { x: total.x / chain.length, y: total.y / chain.length, z: total.z / chain.length }
}

function crossZero(a: Vec, b: Vec): Vec {
  const t = a.z / (a.z - b.z)
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: 0 }
}

function toVec(point: { lat: number; lon: number }, centerLon: number): Vec {
  const λ = ((point.lon - centerLon) * Math.PI) / 180
  const φ = (point.lat * Math.PI) / 180
  return { x: Math.cos(φ) * Math.sin(λ), y: Math.sin(φ), z: Math.cos(φ) * Math.cos(λ) }
}

function project(point: TrackPoint, centerLon: number): { x: number; y: number } | null {
  const vec = toVec(point, centerLon)
  if (vec.z < 0) return null
  return { x: vec.x * 98, y: -vec.y * 98 }
}

function sx(vec: Vec): string {
  return (vec.x * 98).toFixed(2)
}
function sy(vec: Vec): string {
  return (-vec.y * 98).toFixed(2)
}
function cross(a: Vec, b: Vec): Vec {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }
}
function norm(vec: Vec): Vec {
  const length = Math.hypot(vec.x, vec.y, vec.z) || 1
  return { x: vec.x / length, y: vec.y / length, z: vec.z / length }
}
function isLitVec(point: Vec, sun: Vec): boolean {
  return point.x * sun.x + point.y * sun.y + point.z * sun.z > 0
}
