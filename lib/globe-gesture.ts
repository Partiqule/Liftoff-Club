/** Client pixels. A finger is wider than a mouse click, and retina canvases must not shrink this. */
export const GLOBE_TAP_SLOP = 12
export const GLOBE_DOUBLE_TAP_MS = 400
export const GLOBE_DOUBLE_TAP_PX = 44

export type GesturePhase = 'idle' | 'undecided' | 'scroll' | 'turn' | 'pinch'

export type ClientPoint = { x: number; y: number }

export type PointerSample = {
  id: number
  x: number
  y: number
  type: 'mouse' | 'touch' | 'pen'
  button: number
  /** False only for an extra finger. Omitted or true means a new first contact. */
  primary: boolean
  inside: boolean
}

export type PinchAction = {
  type: 'pinch'
  pointers: [ClientPoint, ClientPoint]
  dist: number
  start: boolean
}

export type DownAction =
  | { type: 'ignore' }
  | { type: 'pending' }
  | { type: 'scroll' }
  | { type: 'mouse-turn'; point: ClientPoint }
  | { type: 'start-turn'; point: ClientPoint }
  | PinchAction

export type MoveAction =
  | { type: 'ignore' }
  | { type: 'pending' }
  | { type: 'scroll' }
  | { type: 'start-turn'; point: ClientPoint }
  | { type: 'turn'; point: ClientPoint }
  | PinchAction

export type UpAction = {
  type: 'ignore' | 'tap' | 'double-tap' | 'turn-end' | 'end' | 'engage'
  point: ClientPoint
}

export type TouchPoint = { id: number; x: number; y: number }

type StoredPointer = { x: number; y: number; type: 'mouse' | 'touch' | 'pen' }

export type ListenerHost = {
  addEventListener(type: string, listener: (event: Event) => void, options?: AddEventListenerOptions): void
  removeEventListener(type: string, listener: (event: Event) => void): void
}

export type GlobeGesture = {
  down(sample: PointerSample): DownAction
  move(sample: Pick<PointerSample, 'id' | 'x' | 'y'>): MoveAction
  up(sample: Pick<PointerSample, 'id' | 'x' | 'y'>, kind?: 'up' | 'cancel'): UpAction
  lostCapture(id: number): void
  noteTouches(touches: TouchPoint[]): PinchAction | null
  /** True only while the reader has tapped the globe open. A browsing swipe must not call preventDefault. */
  claimsTouch(): boolean
  setEngaged(next: boolean): void
  isEngaged(): boolean
  /** Called every frame. Time passing does not leave the locked globe. */
  tick(now: number): void
  debug(): { phase: GesturePhase; pointers: number; active: number | null; engaged: boolean; seenAt: number }
}

const surfaces = new WeakSet<object>()

/**
 * One pointer session for a globe.
 * Touch pointers are not captured. iOS stops delivering events after a few
 * setPointerCapture calls that are never released, which freezes the globe.
 * A new primary contact drops any pointer that missed pointerup.
 */
export function createGlobeGesture(hooks?: {
  now?: () => number
  capture?: (id: number) => void
  release?: (id: number) => void
  slop?: number
  doubleTapMs?: number
  doubleTapPx?: number
}): GlobeGesture {
  const now = hooks?.now ?? (() => Date.now())
  const slop = hooks?.slop ?? GLOBE_TAP_SLOP
  const doubleTapMs = hooks?.doubleTapMs ?? GLOBE_DOUBLE_TAP_MS
  const doubleTapPx = hooks?.doubleTapPx ?? GLOBE_DOUBLE_TAP_PX
  const pointers = new Map<number, StoredPointer>()
  const captured = new Set<number>()
  let phase: GesturePhase = 'idle'
  let active: number | null = null
  let downAt: ClientPoint = { x: 0, y: 0 }
  let moved = 0
  let spun = false
  let allowTap = true
  let engaged = false
  let lastTick = 0
  let lastTap: { t: number; x: number; y: number } | null = null

  const releasePointer = (id: number) => {
    pointers.delete(id)
    if (captured.delete(id)) {
      try {
        hooks?.release?.(id)
      } catch {
        // The pointer can already be gone.
      }
    }
    if (active === id) active = null
  }

  const pair = (): { pointers: [ClientPoint, ClientPoint]; dist: number } | null => {
    const items = [...pointers.values()]
    if (items.length < 2) return null
    const a = { x: items[0].x, y: items[0].y }
    const b = { x: items[1].x, y: items[1].y }
    return { pointers: [a, b], dist: Math.hypot(a.x - b.x, a.y - b.y) || 1 }
  }

  const beginPinch = (start: boolean): PinchAction | null => {
    const fingers = pair()
    if (!fingers) return null
    phase = 'pinch'
    allowTap = false
    spun = false
    return { type: 'pinch', pointers: fingers.pointers, dist: fingers.dist, start }
  }

  const flushBrowsing = () => {
    for (const id of [...pointers.keys()]) releasePointer(id)
    phase = 'idle'
    active = null
    moved = 0
    spun = false
    allowTap = true
  }

  return {
    down(sample) {
      if (sample.type === 'mouse' && sample.button !== 0) return { type: 'ignore' }
      if (pointers.has(sample.id)) releasePointer(sample.id)
      if (sample.primary !== false) {
        for (const id of [...pointers.keys()]) releasePointer(id)
        if (!engaged) phase = 'idle'
      }
      pointers.set(sample.id, { x: sample.x, y: sample.y, type: sample.type })
      active = sample.id
      downAt = { x: sample.x, y: sample.y }
      moved = 0
      spun = false
      if (!engaged) {
        allowTap = sample.inside && pointers.size < 2
        phase = allowTap ? 'undecided' : 'scroll'
        return phase === 'scroll' ? { type: 'scroll' } : { type: 'pending' }
      }
      if (pointers.size >= 2) {
        return beginPinch(true) ?? { type: 'ignore' }
      }
      allowTap = true
      phase = 'turn'
      if (sample.type === 'mouse') {
        captured.add(sample.id)
        try {
          hooks?.capture?.(sample.id)
        } catch {
          captured.delete(sample.id)
        }
      }
      return { type: 'start-turn', point: { x: sample.x, y: sample.y } }
    },
    move(sample) {
      const known = pointers.get(sample.id)
      if (!known) return { type: 'ignore' }
      pointers.set(sample.id, { ...known, x: sample.x, y: sample.y })
      const point = { x: sample.x, y: sample.y }
      if (!engaged) {
        moved = Math.max(moved, Math.hypot(point.x - downAt.x, point.y - downAt.y))
        if (moved >= slop) {
          phase = 'scroll'
          allowTap = false
          return { type: 'scroll' }
        }
        return { type: 'pending' }
      }
      if (pointers.size >= 2) {
        const start = phase !== 'pinch'
        return beginPinch(start) ?? { type: 'ignore' }
      }
      if (phase === 'pinch') {
        phase = 'turn'
        active = sample.id
        downAt = point
        moved = 0
        spun = false
        return { type: 'start-turn', point }
      }
      if (sample.id !== active || phase === 'idle') return { type: 'ignore' }
      moved = Math.max(moved, Math.hypot(point.x - downAt.x, point.y - downAt.y))
      if (phase === 'turn') {
        if (moved >= slop) spun = true
        return { type: 'turn', point }
      }
      return { type: 'ignore' }
    },
    up(sample, kind = 'up') {
      const tracked = pointers.has(sample.id)
      const point = { x: sample.x, y: sample.y }
      const wasTap = kind === 'up' && tracked && allowTap && pointers.size <= 1 && phase !== 'scroll' && phase !== 'pinch' && moved < slop
      const wasTurn = kind === 'up' && tracked && spun && phase === 'turn'
      releasePointer(sample.id)
      if (pointers.size === 0) {
        phase = 'idle'
        active = null
      } else if (engaged && phase === 'pinch') {
        phase = 'turn'
        active = [...pointers.keys()][0] ?? null
        moved = 0
        spun = false
      } else if (active == null) {
        active = [...pointers.keys()][0] ?? null
      }
      if (!tracked) return { type: 'ignore', point }
      if (wasTap && !engaged) return { type: 'engage', point }
      if (wasTap && engaged) {
        const at = now()
        if (lastTap && at - lastTap.t <= doubleTapMs && Math.hypot(point.x - lastTap.x, point.y - lastTap.y) <= doubleTapPx) {
          lastTap = null
          return { type: 'double-tap', point }
        }
        lastTap = { t: at, x: point.x, y: point.y }
        return { type: 'tap', point }
      }
      if (wasTurn) return { type: 'turn-end', point }
      return { type: 'end', point }
    },
    lostCapture(id) {
      // Losing capture is not pointerup. The finger may still be down.
      // Forget the capture so a later release does not call releasePointerCapture twice.
      captured.delete(id)
    },
    noteTouches(touches) {
      const live = new Set(touches.map((touch) => touch.id))
      if (touches.length === 0) {
        for (const [id, stored] of [...pointers.entries()]) {
          if (stored.type !== 'mouse') releasePointer(id)
        }
        if (pointers.size === 0) {
          phase = 'idle'
          active = null
          moved = 0
          spun = false
        }
        return null
      }
      if (!engaged) return null
      if (pointers.size > touches.length) {
        for (const [id, stored] of [...pointers.entries()]) {
          if (stored.type !== 'mouse' && !live.has(id)) releasePointer(id)
        }
      }
      for (const touch of touches) {
        const prev = pointers.get(touch.id)
        pointers.set(touch.id, { x: touch.x, y: touch.y, type: prev?.type ?? 'touch' })
      }
      if (pointers.size >= 2) {
        const start = phase !== 'pinch'
        const action = beginPinch(start)
        return start ? action : null
      }
      if (phase === 'pinch') {
        phase = 'turn'
        active = touches[0]?.id ?? active
        moved = 0
        spun = false
      }
      return null
    },
    claimsTouch() {
      return engaged
    },
    setEngaged(next) {
      if (engaged === next) return
      engaged = next
      lastTap = null
      if (!next) flushBrowsing()
    },
    isEngaged() {
      return engaged
    },
    tick(at) {
      lastTick = at
    },
    debug() {
      return { phase, pointers: pointers.size, active, engaged, seenAt: lastTick }
    },
  }
}

export type GlobePointerBinding = {
  read: (event: PointerEvent) => PointerSample | null
  onDown: (action: DownAction) => void
  onMove: (action: MoveAction) => void
  onUp: (action: UpAction) => void
  onTouches: (action: PinchAction | null) => void
}

/** Listeners are attached once per surface. Move and up stay on the host so a missed canvas pointerup cannot stick. */
export function bindGlobePointers(surface: ListenerHost, host: ListenerHost, gesture: GlobeGesture, io: GlobePointerBinding): () => void {
  if (surfaces.has(surface)) return () => {}
  surfaces.add(surface)

  const onDown = (event: Event) => {
    const sample = io.read(event as PointerEvent)
    if (!sample) return
    io.onDown(gesture.down(sample))
  }
  const onMove = (event: Event) => {
    const pointer = event as PointerEvent
    io.onMove(gesture.move({ id: pointer.pointerId, x: pointer.clientX, y: pointer.clientY }))
  }
  const onUp = (event: Event) => {
    const pointer = event as PointerEvent
    io.onUp(gesture.up({ id: pointer.pointerId, x: pointer.clientX, y: pointer.clientY }, 'up'))
  }
  const onCancel = (event: Event) => {
    const pointer = event as PointerEvent
    io.onUp(gesture.up({ id: pointer.pointerId, x: pointer.clientX, y: pointer.clientY }, 'cancel'))
  }
  const onLost = (event: Event) => {
    gesture.lostCapture((event as PointerEvent).pointerId)
  }
  const onTouch = (event: Event) => {
    const touch = event as TouchEvent
    const action = gesture.noteTouches(touchPoints(touch))
    if (gesture.claimsTouch()) touch.preventDefault()
    io.onTouches(action)
  }
  const onTouchEnd = (event: Event) => {
    const touch = event as TouchEvent
    io.onTouches(gesture.noteTouches(touchPoints(touch)))
  }

  surface.addEventListener('pointerdown', onDown)
  surface.addEventListener('lostpointercapture', onLost)
  surface.addEventListener('touchmove', onTouch, { passive: false })
  host.addEventListener('pointermove', onMove)
  host.addEventListener('pointerup', onUp)
  host.addEventListener('pointercancel', onCancel)
  host.addEventListener('touchend', onTouchEnd)
  host.addEventListener('touchcancel', onTouchEnd)

  return () => {
    surfaces.delete(surface)
    surface.removeEventListener('pointerdown', onDown)
    surface.removeEventListener('lostpointercapture', onLost)
    surface.removeEventListener('touchmove', onTouch)
    host.removeEventListener('pointermove', onMove)
    host.removeEventListener('pointerup', onUp)
    host.removeEventListener('pointercancel', onCancel)
    host.removeEventListener('touchend', onTouchEnd)
    host.removeEventListener('touchcancel', onTouchEnd)
  }
}

function touchPoints(event: TouchEvent): TouchPoint[] {
  const list = event.touches
  if (!list || list.length === 0) return []
  const points: TouchPoint[] = []
  for (let index = 0; index < list.length; index += 1) {
    const touch = list.item ? list.item(index) : (list as unknown as Touch[])[index]
    if (!touch) continue
    points.push({ id: touch.identifier, x: touch.clientX, y: touch.clientY })
  }
  return points
}

export type FrameLoop = {
  start: (draw: () => void) => void
  stop: () => void
  readonly starts: number
  readonly ticks: number
  readonly active: boolean
}

/** One animation loop. start() while it is running does not schedule another. */
export function createFrameLoop(request: (cb: () => void) => number, cancel: (id: number) => void): FrameLoop {
  let handle: number | null = null
  let starts = 0
  let ticks = 0
  let draw: (() => void) | null = null
  const step = () => {
    handle = request(step)
    ticks += 1
    try {
      draw?.()
    } catch {
      // One bad frame must not stop the loop. The globe would ignore later touches.
    }
  }
  return {
    get starts() {
      return starts
    },
    get ticks() {
      return ticks
    },
    get active() {
      return handle != null
    },
    start(next) {
      draw = next
      if (handle != null) return
      starts += 1
      handle = request(step)
    },
    stop() {
      draw = null
      if (handle == null) return
      cancel(handle)
      handle = null
    },
  }
}
