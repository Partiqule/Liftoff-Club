import { domePoint } from '@/lib/sky-point'

export type SkyDot = {
  id: string
  name: string
  azimuth: number
  elevation: number
  visible: boolean
  selected: boolean
  showLabel: boolean
}

const CX = 50
const CY = 52
const R = 34

export function SkyDome({ dots, rimAzimuth }: { dots: SkyDot[]; rimAzimuth: number | null }) {
  const ring = (elevation: number) => R * ((90 - elevation) / 90)
  return (
    <svg className="sky-dome" viewBox="-4 0 108 108" role="img" aria-label="Sky map. The center is straight up. The edge is the horizon.">
      <circle className="sky-ring" cx={CX} cy={CY} r={R} />
      <circle className="sky-ring" cx={CX} cy={CY} r={ring(30)} />
      <circle className="sky-ring" cx={CX} cy={CY} r={ring(60)} />
      <text className="sky-dir" x={CX} y={CY - R - 2} textAnchor="middle">
        North
      </text>
      <text className="sky-dir" x={CX + R + 2} y={CY + 1} textAnchor="start">
        East
      </text>
      <text className="sky-dir" x={CX} y={CY + R + 5} textAnchor="middle">
        South
      </text>
      <text className="sky-dir" x={CX - R - 2} y={CY + 1} textAnchor="end">
        West
      </text>
      <text className="sky-tick" x={CX + 2} y={CY - ring(30) + 1.5}>
        30
      </text>
      <text className="sky-tick" x={CX + 2} y={CY - ring(60) + 1.5}>
        60
      </text>
      {rimAzimuth == null ? null : <RimMark azimuth={rimAzimuth} />}
      {dots.map((dot) => {
        const point = place(dot.azimuth, dot.elevation)
        const tone = dot.selected ? 'sky-dot sky-dot-selected' : dot.visible ? 'sky-dot sky-dot-visible' : 'sky-dot'
        return (
          <g key={dot.id}>
            <circle className={tone} cx={point.x} cy={point.y} r={dot.selected ? 2.2 : 1.5} />
            {dot.showLabel ? (
              <text className="sky-name-label" x={point.x} y={point.y - 2.6} textAnchor="middle">
                {dot.name}
              </text>
            ) : null}
          </g>
        )
      })}
    </svg>
  )
}

function RimMark({ azimuth }: { azimuth: number }) {
  const outer = place(azimuth, 0)
  const inner = place(azimuth, 10)
  return <line className="sky-rim" x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} />
}

function place(azimuth: number, elevation: number): { x: number; y: number } {
  const point = domePoint(azimuth, elevation)
  return {
    x: CX + (point.x - 0.5) * 2 * R,
    y: CY + (point.y - 0.5) * 2 * R,
  }
}
