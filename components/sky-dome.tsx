'use client'

import { useEffect, useRef, useState } from 'react'
import { domePoint, skyAzimuth, skyDragMode, skyHitRadius, skyWheelZoom } from '@/lib/sky-point'
import type { SkyDot } from '@/components/sky-dots'

export type { SkyDot }

const CX = 50
const CY = 52
const R = 34

type PathPoint = { azimuth: number; elevation: number }

export function SkyDome({
  dots,
  path,
  heading,
  zoom,
  label,
  onZoom,
  onPick,
}: {
  dots: SkyDot[]
  path: PathPoint[]
  heading: number | null
  zoom: number
  label: string
  onZoom: (zoom: number) => void
  onPick: (id: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const dragged = useRef(false)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const zoomRef = useRef(zoom)
  const panRef = useRef(pan)
  const [trackedZoom, setTrackedZoom] = useState(zoom)
  if (zoom !== trackedZoom) {
    setTrackedZoom(zoom)
    if (zoom <= 1.01) setPan({ x: 0, y: 0 })
  }
  const shownPan = zoom <= 1.01 ? { x: 0, y: 0 } : pan

  useEffect(() => {
    zoomRef.current = zoom
    panRef.current = zoom <= 1.01 ? { x: 0, y: 0 } : pan
  }, [zoom, pan])

  useEffect(() => {
    const node = ref.current
    if (!node) return
    let mode: 'idle' | 'undecided' | 'scroll' | 'move' | 'pinch' = 'idle'
    let pointer: number | null = null
    let start = { x: 0, y: 0, panX: 0, panY: 0 }
    let moved = 0
    let pinch: { dist: number; zoom: number } | null = null
    const pointers = new Map<number, { x: number; y: number }>()

    const onDown = (event: PointerEvent) => {
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (pointers.size >= 2) {
        mode = 'pinch'
        const [a, b] = [...pointers.values()]
        pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: zoomRef.current }
        if (node.hasPointerCapture(event.pointerId) === false) node.setPointerCapture(event.pointerId)
        return
      }
      pointer = event.pointerId
      start = { x: event.clientX, y: event.clientY, panX: panRef.current.x, panY: panRef.current.y }
      moved = 0
      dragged.current = false
      mode = event.pointerType === 'mouse' && zoomRef.current > 1.05 ? 'move' : 'undecided'
      if (mode === 'move') node.setPointerCapture(event.pointerId)
    }
    const onMove = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (mode === 'pinch' && pointers.size >= 2 && pinch) {
        if (event.cancelable) event.preventDefault()
        const [a, b] = [...pointers.values()]
        const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1
        onZoom(pinch.zoom * (dist / pinch.dist))
        return
      }
      if (event.pointerId !== pointer || mode === 'scroll' || mode === 'pinch') return
      const dx = event.clientX - start.x
      const dy = event.clientY - start.y
      moved = Math.max(moved, Math.hypot(dx, dy))
      if (moved > 8) dragged.current = true
      if (mode === 'undecided') {
        const next = skyDragMode({ moved, dx, dy, zoom: zoomRef.current })
        if (next === 'undecided') return
        mode = next
        if (mode === 'scroll') return
        node.setPointerCapture(event.pointerId)
      }
      if (mode !== 'move') return
      const rect = node.getBoundingClientRect()
      const unit = 108 / Math.max(1, rect.width)
      setPan({
        x: start.panX + dx * unit,
        y: start.panY + dy * unit,
      })
    }
    const onUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId)
      if (pointers.size < 2) pinch = null
      if (event.pointerId === pointer) {
        pointer = null
        mode = 'idle'
      }
    }
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length < 2) return
      event.preventDefault()
      mode = 'pinch'
      const [a, b] = [event.touches[0], event.touches[1]]
      pinch = { dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1, zoom: zoomRef.current }
    }
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length < 2 || !pinch) return
      event.preventDefault()
      const [a, b] = [event.touches[0], event.touches[1]]
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1
      onZoom(pinch.zoom * (dist / pinch.dist))
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      onZoom(skyWheelZoom(zoomRef.current, event.deltaY, event.deltaMode))
    }
    node.addEventListener('pointerdown', onDown)
    node.addEventListener('pointermove', onMove)
    node.addEventListener('pointerup', onUp)
    node.addEventListener('pointercancel', onUp)
    node.addEventListener('touchstart', onTouchStart, { passive: false })
    node.addEventListener('touchmove', onTouchMove, { passive: false })
    node.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      node.removeEventListener('pointerdown', onDown)
      node.removeEventListener('pointermove', onMove)
      node.removeEventListener('pointerup', onUp)
      node.removeEventListener('pointercancel', onUp)
      node.removeEventListener('touchstart', onTouchStart)
      node.removeEventListener('touchmove', onTouchMove)
      node.removeEventListener('wheel', onWheel)
    }
  }, [onZoom])

  const ring = (elevation: number) => R * ((90 - elevation) / 90)
  const hit = skyHitRadius(zoom)
  const dirs: Array<[string, number]> = [
    ['North', 0],
    ['East', 90],
    ['South', 180],
    ['West', 270],
  ]
  return (
    <div className="sky-frame" ref={ref}>
      <svg className="sky-dome" viewBox="-4 0 108 108" role="img" aria-label={label}>
        <g transform={`translate(${CX + shownPan.x} ${CY + shownPan.y}) scale(${zoom}) translate(${-CX} ${-CY})`}>
          <circle className="sky-ring" cx={CX} cy={CY} r={R} />
          <circle className="sky-ring" cx={CX} cy={CY} r={ring(30)} />
          <circle className="sky-ring" cx={CX} cy={CY} r={ring(60)} />
          {dirs.map(([name, azimuth]) => {
            const spot = rimLabel(azimuth, heading)
            return (
              <text key={name} className="sky-dir" x={spot.x} y={spot.y} textAnchor="middle" fontSize={4.2 / zoom}>
                {name}
              </text>
            )
          })}
          <text className="sky-tick" x={CX + 2} y={CY - ring(30) + 1.5} fontSize={3.6 / zoom}>
            30
          </text>
          <text className="sky-tick" x={CX + 2} y={CY - ring(60) + 1.5} fontSize={3.6 / zoom}>
            60
          </text>
          {path.length > 1 ? (
            <polyline
              className="sky-path"
              fill="none"
              points={path.map((point) => {
                const spot = place(point.azimuth, point.elevation, heading)
                return `${spot.x},${spot.y}`
              }).join(' ')}
            />
          ) : null}
          {dots.map((dot) => {
            const point = place(dot.azimuth, dot.elevation, heading)
            const tone = dot.selected ? 'sky-dot sky-dot-selected' : dot.visible ? 'sky-dot sky-dot-visible' : 'sky-dot'
            return (
              <g
                key={dot.id}
                role="button"
                tabIndex={0}
                aria-label={dot.name}
                onClick={() => {
                  if (dragged.current) return
                  onPick(dot.id)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onPick(dot.id)
                  }
                }}
              >
                <circle className="sky-hit" cx={point.x} cy={point.y} r={hit} />
                <circle className={tone} cx={point.x} cy={point.y} r={(dot.selected ? 2.4 : 1.7) / zoom} />
                {dot.showLabel ? (
                  <text className="sky-name-label" x={point.x} y={point.y - 3.2 / zoom} textAnchor="middle" fontSize={4.4 / zoom}>
                    {dot.name}
                  </text>
                ) : null}
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}

function place(azimuth: number, elevation: number, heading: number | null): { x: number; y: number } {
  const point = domePoint(skyAzimuth(azimuth, heading), elevation)
  return {
    x: CX + (point.x - 0.5) * 2 * R,
    y: CY + (point.y - 0.5) * 2 * R,
  }
}

function rimLabel(azimuth: number, heading: number | null): { x: number; y: number } {
  const rim = place(azimuth, 0, heading)
  const dx = rim.x - CX
  const dy = rim.y - CY
  const len = Math.hypot(dx, dy) || 1
  return { x: CX + (dx / len) * (R + 4.5), y: CY + (dy / len) * (R + 4.5) + 1.2 }
}
