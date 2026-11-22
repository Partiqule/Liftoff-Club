export type LabelSide = 'up' | 'down' | 'left' | 'right'

export type LabelBox = { x: number; y: number; w: number; h: number }

export type LabelObstacle =
  | { kind: 'disc'; x: number; y: number; r: number }
  | { kind: 'seg'; x1: number; y1: number; x2: number; y2: number }

export type LabelRequest = {
  id: string
  anchor: { x: number; y: number }
  w: number
  h: number
  prefer?: LabelSide
}

export type PlacedLabel = { id: string; x: number; y: number; leader: boolean }

const DIRS: Array<[number, number, LabelSide]> = [
  [0, -1, 'up'],
  [1, -1, 'up'],
  [1, 0, 'right'],
  [1, 1, 'down'],
  [0, 1, 'down'],
  [-1, 1, 'down'],
  [-1, 0, 'left'],
  [-1, -1, 'up'],
]

/** Put each label in the frame, off the marks and the path. A leader is used when the words sit away from the mark. */
export function placeLabels(
  requests: LabelRequest[],
  obstacles: LabelObstacle[],
  frame: { w: number; h: number },
  margin = 8,
  clearance = 10,
): PlacedLabel[] {
  const placed: LabelBox[] = []
  const result: PlacedLabel[] = []
  for (const request of requests) {
    const spot = choose(request, obstacles, placed, frame, margin, clearance)
    result.push({ id: request.id, x: spot.x, y: spot.y, leader: spot.leader })
    placed.push({ x: spot.x, y: spot.y, w: request.w, h: request.h })
  }
  return result
}

function choose(
  request: LabelRequest,
  obstacles: LabelObstacle[],
  placed: LabelBox[],
  frame: { w: number; h: number },
  margin: number,
  clearance: number,
): { x: number; y: number; leader: boolean } {
  const gaps = [22, 36, 52, 70, 96, 124]
  let best: { x: number; y: number; score: number } | null = null
  for (const [dx, dy, side] of DIRS) {
    const len = Math.hypot(dx, dy) || 1
    for (const gap of gaps) {
      const rawX = request.anchor.x + (dx / len) * (gap + request.w / 2)
      const rawY = request.anchor.y + (dy / len) * (gap + request.h / 2)
      const fitted = clampInside(rawX, rawY, request.w, request.h, frame, margin)
      const box = { x: fitted.x, y: fitted.y, w: request.w, h: request.h }
      const shift = Math.hypot(fitted.x - rawX, fitted.y - rawY)
      let score = gap * 0.15 + shift * 14
      if (request.prefer && request.prefer !== side) score += 18
      score += framePenalty(box, frame, margin)
      score += obstaclePenalty(box, obstacles, clearance)
      score += placed.reduce((sum, item) => sum + (boxesOverlap(box, item, 6) ? 5200 : 0), 0)
      if (!best || score < best.score) best = { x: fitted.x, y: fitted.y, score }
    }
  }
  const pick = best ?? { x: request.anchor.x, y: request.anchor.y - request.h, score: 0 }
  const fitted = clampInside(pick.x, pick.y, request.w, request.h, frame, margin)
  const lead = Math.hypot(fitted.x - request.anchor.x, fitted.y - request.anchor.y) > request.h * 0.8
  return { x: fitted.x, y: fitted.y, leader: lead }
}

function clampInside(
  x: number,
  y: number,
  w: number,
  h: number,
  frame: { w: number; h: number },
  margin: number,
): { x: number; y: number } {
  const halfW = w / 2
  const halfH = h / 2
  return {
    x: Math.min(frame.w - margin - halfW, Math.max(margin + halfW, x)),
    y: Math.min(frame.h - margin - halfH, Math.max(margin + halfH, y)),
  }
}

function framePenalty(box: LabelBox, frame: { w: number; h: number }, margin: number): number {
  const left = box.x - box.w / 2
  const right = box.x + box.w / 2
  const top = box.y - box.h / 2
  const bottom = box.y + box.h / 2
  let penalty = 0
  if (left < margin) penalty += (margin - left) * 40
  if (right > frame.w - margin) penalty += (right - (frame.w - margin)) * 40
  if (top < margin) penalty += (margin - top) * 40
  if (bottom > frame.h - margin) penalty += (bottom - (frame.h - margin)) * 40
  return penalty
}

function obstaclePenalty(box: LabelBox, obstacles: LabelObstacle[], clearance: number): number {
  let penalty = 0
  for (const item of obstacles) {
    if (item.kind === 'disc') {
      if (boxHitsDisc(box, item.x, item.y, item.r + clearance)) penalty += 1000
    } else if (segmentHitsBox(item, box, clearance)) {
      penalty += 2500
    }
  }
  return penalty
}

/** True when a tap lands on a label, including a finger sized box around short words. */
export function pointInLabel(
  x: number,
  y: number,
  label: { x: number; y: number; w: number; h: number },
  min = 0,
): boolean {
  const halfW = Math.max(label.w, min) / 2
  const halfH = Math.max(label.h, min) / 2
  return Math.abs(x - label.x) <= halfW && Math.abs(y - label.y) <= halfH
}

function boxesOverlap(a: LabelBox, b: LabelBox, pad: number): boolean {
  return Math.abs(a.x - b.x) * 2 < a.w + b.w + pad && Math.abs(a.y - b.y) * 2 < a.h + b.h + pad
}

function boxHitsDisc(box: LabelBox, x: number, y: number, r: number): boolean {
  const cx = Math.max(box.x - box.w / 2, Math.min(x, box.x + box.w / 2))
  const cy = Math.max(box.y - box.h / 2, Math.min(y, box.y + box.h / 2))
  return (cx - x) ** 2 + (cy - y) ** 2 <= r * r
}

function segmentHitsBox(seg: { x1: number; y1: number; x2: number; y2: number }, box: LabelBox, pad: number): boolean {
  const left = box.x - box.w / 2 - pad
  const right = box.x + box.w / 2 + pad
  const top = box.y - box.h / 2 - pad
  const bottom = box.y + box.h / 2 + pad
  const samples = 5
  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples
    const x = seg.x1 + (seg.x2 - seg.x1) * t
    const y = seg.y1 + (seg.y2 - seg.y1) * t
    if (x >= left && x <= right && y >= top && y <= bottom) return true
  }
  return false
}
