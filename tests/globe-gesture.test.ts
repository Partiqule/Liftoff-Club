import { describe, expect, it } from 'vitest'
import { pointInLabel } from '@/lib/globe-labels'
import {
  bindGlobePointers,
  createFrameLoop,
  createGlobeGesture,
  type ListenerHost,
  type PointerSample,
} from '@/lib/globe-gesture'

function finger(id: number, x: number, y: number, primary: boolean, inside = true): PointerSample {
  return { id, x, y, type: 'touch', button: 0, primary, inside }
}

class Bus implements ListenerHost {
  adds = 0
  removes = 0
  private listeners = new Map<string, Set<(event: Event) => void>>()

  addEventListener(type: string, listener: (event: Event) => void): void {
    this.adds += 1
    const set = this.listeners.get(type) ?? new Set()
    set.add(listener)
    this.listeners.set(type, set)
  }

  removeEventListener(type: string, listener: (event: Event) => void): void {
    this.removes += 1
    this.listeners.get(type)?.delete(listener)
  }

  emit(event: { type: string } & Record<string, unknown>): void {
    for (const listener of this.listeners.get(event.type) ?? []) listener(event as unknown as Event)
  }
}

function bindPair(gesture = createGlobeGesture({ now: () => 0 })) {
  const surface = new Bus()
  const host = new Bus()
  const unbind = bindGlobePointers(surface, host, gesture, {
    read: (event) => {
      const pointer = event as PointerEvent
      return {
        id: pointer.pointerId,
        x: pointer.clientX,
        y: pointer.clientY,
        type: pointer.pointerType === 'mouse' ? 'mouse' : 'touch',
        button: pointer.button ?? 0,
        primary: pointer.isPrimary !== false,
        inside: true,
      }
    },
    onDown: () => undefined,
    onMove: () => undefined,
    onUp: () => undefined,
    onTouches: () => undefined,
  })
  return { surface, host, unbind, gesture }
}

describe('globe gesture session', () => {
  it('keeps turning after hundreds of taps, drags, pinches, and cancels', () => {
    let clock = 0
    const captures: number[] = []
    const releases: number[] = []
    const gesture = createGlobeGesture({
      now: () => clock,
      capture: (id) => captures.push(id),
      release: (id) => releases.push(id),
    })

    for (let index = 0; index < 120; index += 1) {
      clock += 30
      gesture.down(finger(1, 40, 40, true))
      gesture.up({ id: 1, x: 40, y: 41 })
      expect(gesture.debug()).toMatchObject({ phase: 'idle', pointers: 0, active: null })
    }

    for (let index = 0; index < 80; index += 1) {
      clock += 40
      gesture.down(finger(index + 2, 20, 80, true))
      const started = gesture.move({ id: index + 2, x: 70, y: 82 })
      expect(started.type).toBe('start-turn')
      const dragged = gesture.move({ id: index + 2, x: 110, y: 84 })
      expect(dragged.type).toBe('turn')
      const ended = gesture.up({ id: index + 2, x: 110, y: 84 })
      expect(ended.type).toBe('turn-end')
      expect(gesture.debug().pointers).toBe(0)
    }

    for (let index = 0; index < 40; index += 1) {
      clock += 50
      gesture.down(finger(1, 30, 30, true))
      gesture.down(finger(2, 90, 30, false))
      expect(gesture.debug().phase).toBe('pinch')
      const zoom = gesture.move({ id: 2, x: 140, y: 36 })
      expect(zoom.type).toBe('pinch')
      gesture.up({ id: 2, x: 140, y: 36 })
      gesture.up({ id: 1, x: 30, y: 30 })
      expect(gesture.debug()).toMatchObject({ phase: 'idle', pointers: 0 })
    }

    for (let index = 0; index < 40; index += 1) {
      gesture.down(finger(8, 10, 10, true))
      gesture.move({ id: 8, x: 60, y: 12 })
      const cancelled = gesture.up({ id: 8, x: 60, y: 12 }, 'cancel')
      expect(cancelled.type).not.toBe('tap')
      expect(gesture.debug().pointers).toBe(0)
    }

    expect(captures).toEqual([])
    const again = gesture.down(finger(9, 12, 12, true))
    expect(again.type).toBe('pending')
    expect(gesture.move({ id: 9, x: 80, y: 14 }).type).toBe('start-turn')
    expect(gesture.move({ id: 9, x: 120, y: 16 }).type).toBe('turn')
    gesture.up({ id: 9, x: 120, y: 16 })
    expect(gesture.debug()).toMatchObject({ phase: 'idle', pointers: 0, active: null })
    expect(releases).toEqual([])
  })

  it('drops a stuck touch when the next tap starts, and does not capture touch pointers', () => {
    const captures: number[] = []
    const releases: number[] = []
    const gesture = createGlobeGesture({
      capture: (id) => captures.push(id),
      release: (id) => releases.push(id),
    })

    for (let index = 0; index < 6; index += 1) {
      gesture.down(finger(index + 1, 15, 15, true))
      gesture.move({ id: index + 1, x: 70, y: 18 })
      gesture.lostCapture(index + 1)
      expect(gesture.debug().pointers).toBe(1)
    }

    expect(gesture.debug().pointers).toBe(1)
    expect(gesture.debug().phase).not.toBe('pinch')
    gesture.down(finger(40, 18, 22, true))
    expect(gesture.debug()).toMatchObject({ pointers: 1, active: 40 })
    expect(gesture.move({ id: 40, x: 90, y: 24 }).type).toBe('start-turn')
    gesture.up({ id: 40, x: 90, y: 24 })
    expect(gesture.debug()).toMatchObject({ phase: 'idle', pointers: 0 })
    expect(captures).toEqual([])
    expect(releases).toEqual([])

    gesture.down({ id: 3, x: 10, y: 10, type: 'mouse', button: 0, primary: true, inside: true })
    expect(captures).toEqual([3])
    gesture.up({ id: 3, x: 10, y: 10 })
    expect(releases).toEqual([3])
  })

  it('clears a pointer that never received pointerup when the touch list is empty', () => {
    const gesture = createGlobeGesture()
    gesture.down(finger(1, 20, 20, true))
    gesture.move({ id: 1, x: 80, y: 22 })
    expect(gesture.debug().phase).toBe('turn')
    gesture.noteTouches([])
    expect(gesture.debug()).toMatchObject({ phase: 'idle', pointers: 0, active: null })
    expect(gesture.down(finger(2, 20, 20, true)).type).toBe('pending')
    expect(gesture.move({ id: 2, x: 88, y: 24 }).type).toBe('start-turn')
  })

  it('still pinches after a cancelled second finger', () => {
    const gesture = createGlobeGesture()
    gesture.down(finger(1, 20, 40, true))
    gesture.down(finger(2, 80, 40, false))
    gesture.up({ id: 2, x: 80, y: 40 }, 'cancel')
    gesture.up({ id: 1, x: 22, y: 40 }, 'cancel')
    expect(gesture.debug().pointers).toBe(0)
    gesture.down(finger(3, 20, 40, true))
    gesture.down(finger(4, 100, 48, false))
    expect(gesture.debug().phase).toBe('pinch')
    expect(gesture.move({ id: 4, x: 150, y: 52 }).type).toBe('pinch')
  })

  it('attaches listeners once and a stress run does not stack them or animation loops', () => {
    const { surface, host, unbind, gesture } = bindPair()
    const attached = surface.adds + host.adds
    expect(attached).toBe(8)
    bindGlobePointers(surface, host, gesture, {
      read: () => null,
      onDown: () => undefined,
      onMove: () => undefined,
      onUp: () => undefined,
      onTouches: () => undefined,
    })
    expect(surface.adds + host.adds).toBe(attached)

    for (let index = 0; index < 200; index += 1) {
      surface.emit({ type: 'pointerdown', pointerId: 1, pointerType: 'touch', button: 0, isPrimary: true, clientX: 10, clientY: 10 })
      host.emit({ type: 'pointermove', pointerId: 1, clientX: 80, clientY: 12 })
      if (index % 5 === 0) host.emit({ type: 'pointercancel', pointerId: 1, clientX: 80, clientY: 12 })
      else host.emit({ type: 'pointerup', pointerId: 1, clientX: 80, clientY: 12 })
      if (index % 7 === 0) {
        surface.emit({ type: 'pointerdown', pointerId: 4, pointerType: 'touch', button: 0, isPrimary: true, clientX: 12, clientY: 12 })
        surface.emit({ type: 'lostpointercapture', pointerId: 4 })
        host.emit({ type: 'touchend', touches: { length: 0 } })
      }
    }
    expect(surface.adds + host.adds).toBe(attached)
    expect(gesture.debug().pointers).toBe(0)

    const queued = new Map<number, () => void>()
    let next = 1
    let boom = false
    const loop = createFrameLoop(
      (cb) => {
        const id = next
        next += 1
        queued.set(id, cb)
        return id
      },
      (id) => queued.delete(id),
    )
    const draw = () => {
      if (boom) throw new Error('frame')
    }
    for (let index = 0; index < 300; index += 1) loop.start(draw)
    expect(loop.starts).toBe(1)
    expect(loop.active).toBe(true)
    for (let index = 0; index < 8; index += 1) {
      if (index === 3) boom = true
      const entry = queued.entries().next()
      expect(entry.done).toBe(false)
      if (entry.done) break
      queued.delete(entry.value[0])
      entry.value[1]()
      boom = false
    }
    expect(loop.ticks).toBe(8)
    expect(loop.starts).toBe(1)
    expect(loop.active).toBe(true)
    loop.stop()
    expect(loop.active).toBe(false)
    loop.start(draw)
    expect(loop.starts).toBe(2)
    loop.stop()
    unbind()
    expect(surface.removes + host.removes).toBe(attached)
  })
})

describe('globe label hits', () => {
  it('counts a tap on the words even when they sit away from the mark', () => {
    const label = { x: 40, y: 30, w: 20, h: 12 }
    expect(pointInLabel(40, 30, label, 44)).toBe(true)
    expect(pointInLabel(20, 30, label, 44)).toBe(true)
    expect(pointInLabel(200, 30, label, 44)).toBe(false)
  })
})
