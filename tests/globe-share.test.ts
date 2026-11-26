import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { claimGlobe, resetGlobeCoordinationForTests, vacateGlobe } from '@/lib/globe-lock'
import {
  createGlobeShare,
  homeLegendShowsSatellite,
  homeLegendShowsYou,
  legendKeepsTarget,
  type GlobeCanvas,
  type GlobeView,
} from '@/lib/globe-share'

const VIEW: GlobeView = { yaw: 0.4, pitch: 0.2, distance: 2.8 }

const GL_NAMES = [
  'ARRAY_BUFFER',
  'ELEMENT_ARRAY_BUFFER',
  'STATIC_DRAW',
  'FLOAT',
  'UNSIGNED_SHORT',
  'TRIANGLES',
  'TEXTURE_2D',
  'TEXTURE0',
  'RGBA',
  'UNSIGNED_BYTE',
  'CLAMP_TO_EDGE',
  'LINEAR',
  'LINEAR_MIPMAP_LINEAR',
  'UNPACK_FLIP_Y_WEBGL',
  'MAX_TEXTURE_SIZE',
  'DEPTH_TEST',
  'LEQUAL',
  'CULL_FACE',
  'BACK',
  'BLEND',
  'VERTEX_SHADER',
  'FRAGMENT_SHADER',
  'COMPILE_STATUS',
  'LINK_STATUS',
  'SCISSOR_TEST',
  'TEXTURE_MAG_FILTER',
  'TEXTURE_MIN_FILTER',
  'TEXTURE_WRAP_S',
  'TEXTURE_WRAP_T',
  'COLOR_BUFFER_BIT',
  'DEPTH_BUFFER_BIT',
]

function fakeCanvas(): GlobeCanvas & { emit(type: string): { defaultPrevented: boolean } } {
  const listeners = new Map<string, Set<(event: Event) => void>>()
  return {
    width: 0,
    height: 0,
    addEventListener(type, listener) {
      const set = listeners.get(type) ?? new Set()
      set.add(listener)
      listeners.set(type, set)
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener)
    },
    emit(type) {
      const event = {
        type,
        defaultPrevented: false,
        preventDefault() {
          this.defaultPrevented = true
        },
      }
      for (const listener of listeners.get(type) ?? []) listener(event as unknown as Event)
      return event
    },
  }
}

function fakeGL(onLose: () => void, viewports: number[][]) {
  const constants: Record<string, number> = { NO_ERROR: 0 }
  GL_NAMES.forEach((name, index) => {
    constants[name] = index + 1
  })
  let draws = 0
  const gl = new Proxy(constants, {
    get(target, prop) {
      if (typeof prop !== 'string') return undefined
      if (prop === 'getError') return () => 0
      if (prop === 'getShaderParameter' || prop === 'getProgramParameter') return () => true
      if (prop === 'getParameter') return () => 4096
      if (prop === 'getExtension') {
        return (name: string) => (name === 'WEBGL_lose_context' ? { loseContext: onLose } : null)
      }
      if (prop === 'createShader' || prop === 'createProgram' || prop === 'createBuffer' || prop === 'createTexture' || prop === 'getUniformLocation') {
        return () => ({})
      }
      if (prop === 'viewport') {
        return (...args: number[]) => {
          viewports.push(args)
        }
      }
      if (prop === 'drawElements') {
        return () => {
          draws += 1
        }
      }
      if (prop in target) return target[prop]
      return () => undefined
    },
  })
  return { gl: gl as unknown as WebGLRenderingContext, drawn: () => draws }
}

function syncImage() {
  let onload: (() => void) | null = null
  let onerror: (() => void) | null = null
  return {
    naturalWidth: 2,
    naturalHeight: 2,
    width: 2,
    height: 2,
    crossOrigin: '',
    decoding: 'async',
    get onload() {
      return onload
    },
    set onload(fn: (() => void) | null) {
      onload = fn
    },
    get onerror() {
      return onerror
    },
    set onerror(fn: (() => void) | null) {
      onerror = fn
    },
    get src() {
      return ''
    },
    set src(_value: string) {
      onload?.()
    },
  }
}

function blankDest(blits: { n: number }) {
  return {
    clearRect() {
      return undefined
    },
    drawImage() {
      blits.n += 1
    },
  } as unknown as CanvasRenderingContext2D
}

function harness() {
  const viewports: number[][] = []
  let contexts = 0
  let loses = 0
  let canvas = fakeCanvas()
  const share = createGlobeShare({
    now: () => Date.UTC(2026, 10, 26, 12, 0, 0),
    createCanvas: () => {
      canvas = fakeCanvas()
      return canvas
    },
    getContext: () => {
      contexts += 1
      return fakeGL(() => {
        loses += 1
      }, viewports).gl
    },
    createImage: syncImage,
  })
  return {
    share,
    viewports,
    canvas: () => canvas,
    contexts: () => contexts,
    loses: () => loses,
  }
}

describe('shared globe stress', () => {
  it('keeps one WebGL context while many globes scroll, engage, and leave', () => {
    resetGlobeCoordinationForTests()
    const { share, contexts, loses, canvas, viewports } = harness()
    const seats = Array.from({ length: 18 }, () => share.join())
    expect(contexts()).toBe(1)
    expect(share.debug()).toMatchObject({ contexts: 1, created: 1, users: 18, unavailable: false })
    expect(seats.every((seat) => seat.hasContext())).toBe(true)

    const blits = { n: 0 }
    const dest = blankDest(blits)
    let shown = 0
    for (let lap = 0; lap < 12; lap += 1) {
      let lapShown = 0
      seats.forEach((seat, index) => {
        const on = index % 4 === lap % 4
        seat.setVisible(on)
        if (on) lapShown += 1
      })
      shown += lapShown
      for (const seat of seats) seat.paint(256, VIEW, dest)
    }
    expect(shown).toBe(54)
    expect(blits.n).toBe(shown)
    expect(share.debug().visible).toBe(4)
    expect(contexts()).toBe(1)

    const hidden = seats[0]
    hidden.setVisible(false)
    hidden.setEngaged(true)
    const before = share.debug().draws
    expect(hidden.paint(256, VIEW, dest)).toBe(false)
    expect(share.debug().draws).toBe(before)

    let lastRelease: (() => void) | null = null
    let peak = 0
    for (const seat of seats) {
      const id = claimGlobe(() => seat.setEngaged(false))
      seat.setEngaged(true)
      seat.setVisible(true)
      peak = Math.max(peak, share.debug().engaged)
      lastRelease = () => {
        seat.setEngaged(false)
        vacateGlobe(id)
      }
    }
    expect(peak).toBe(1)
    expect(share.debug().engaged).toBe(1)
    lastRelease?.()
    expect(share.debug().engaged).toBe(0)

    for (let lap = 0; lap < 40; lap += 1) {
      const seat = seats[lap % seats.length]
      seat.setVisible(true)
      seat.setEngaged(true)
      seat.paint(220, VIEW, dest)
      seat.setEngaged(false)
      seat.setVisible(lap % 2 === 0)
      const extra = share.join()
      extra.setVisible(false)
      extra.paint(220, VIEW, dest)
      extra.leave()
    }
    expect(contexts()).toBe(1)
    expect(share.debug().contexts).toBe(1)
    expect(share.debug().released).toBe(0)

    const lost = canvas().emit('webglcontextlost')
    expect(lost.defaultPrevented).toBe(true)
    expect(share.debug().lost).toBe(true)
    const stalled = share.debug().draws
    seats[1].setVisible(true)
    expect(seats[1].paint(256, VIEW, dest)).toBe(false)
    expect(share.debug().draws).toBe(stalled)
    canvas().emit('webglcontextrestored')
    expect(share.debug().lost).toBe(false)
    expect(contexts()).toBe(1)
    expect(seats[1].paint(256, VIEW, dest)).toBe(true)
    expect(share.debug().draws).toBe(stalled + 1)

    for (const seat of seats) seat.leave()
    seats[0].leave()
    expect(share.debug()).toMatchObject({ contexts: 0, users: 0, released: 1, created: 1 })
    expect(loses()).toBe(1)

    const again = Array.from({ length: 8 }, () => share.join())
    expect(contexts()).toBe(2)
    expect(share.debug().contexts).toBe(1)
    for (const seat of again) seat.leave()
    expect(share.debug()).toMatchObject({ contexts: 0, released: 2, created: 2 })
    expect(loses()).toBe(2)
    expect(viewports.length).toBeGreaterThan(0)
  })

  it('draws a smaller globe from the top of the shared buffer', () => {
    const { share, viewports } = harness()
    const seat = share.join()
    const blits = { n: 0 }
    const dest = blankDest(blits)
    expect(seat.paint(100, VIEW, dest)).toBe(true)
    expect(seat.paint(180, VIEW, dest)).toBe(true)
    expect(seat.paint(100, VIEW, dest)).toBe(true)
    expect(viewports[0]).toEqual([0, 0, 100, 100])
    expect(viewports[1]).toEqual([0, 0, 180, 180])
    expect(viewports.at(-1)).toEqual([0, 80, 100, 100])
    expect(blits.n).toBe(3)
    seat.leave()
    expect(share.debug().contexts).toBe(0)
  })

  it('does not open a second context when WebGL is missing', () => {
    let calls = 0
    const share = createGlobeShare({
      createCanvas: fakeCanvas,
      getContext: () => {
        calls += 1
        return null
      },
      createImage: syncImage,
    })
    const seats = Array.from({ length: 20 }, () => share.join())
    const blits = { n: 0 }
    for (const seat of seats) {
      expect(seat.hasContext()).toBe(false)
      expect(seat.paint(80, VIEW, blankDest(blits))).toBe(false)
      seat.leave()
    }
    const extra = share.join()
    extra.leave()
    expect(calls).toBe(1)
    expect(blits.n).toBe(0)
    expect(share.debug().contexts).toBe(0)
  })

  it('filters legend dots and keeps one page of WebGL in the scene source', () => {
    expect(homeLegendShowsSatellite(null, 'hubble')).toBe(true)
    expect(homeLegendShowsSatellite('station', 'station')).toBe(true)
    expect(homeLegendShowsSatellite('station', 'hubble')).toBe(false)
    expect(homeLegendShowsSatellite('station', 'bright')).toBe(false)
    expect(homeLegendShowsSatellite('starlink', 'starlink')).toBe(true)
    expect(homeLegendShowsSatellite('bright', 'station')).toBe(false)
    expect(homeLegendShowsSatellite('you', 'station')).toBe(false)
    expect(homeLegendShowsYou(null)).toBe(true)
    expect(homeLegendShowsYou('you')).toBe(true)
    expect(homeLegendShowsYou('bright')).toBe(false)
    expect(legendKeepsTarget('station', { type: 'sat', id: '1' }, () => 'station')).toBe(true)
    expect(legendKeepsTarget('station', { type: 'sat', id: '1' }, () => 'bright')).toBe(false)
    expect(legendKeepsTarget('you', { type: 'you' }, () => null)).toBe(true)
    expect(legendKeepsTarget('you', { type: 'sat', id: '1' }, () => 'station')).toBe(false)
    expect(legendKeepsTarget('bright', { type: 'pad' }, () => null)).toBe(true)
    expect(legendKeepsTarget(null, { type: 'sat', id: '1' }, () => 'starlink')).toBe(true)

    const root = path.resolve(__dirname, '..')
    const scene = readFileSync(path.join(root, 'components/radar-scene.tsx'), 'utf8')
    const share = readFileSync(path.join(root, 'lib/globe-share.ts'), 'utf8')
    const home = readFileSync(path.join(root, 'components/flight-radar.tsx'), 'utf8')
    const webgl = (source: string) => source.match(/getContext\(\s*['"]webgl['"]/g) ?? []
    expect(webgl(scene)).toEqual([])
    expect(webgl(share)).toHaveLength(1)
    expect(scene).toContain('globeShare')
    expect(scene).toContain('seat.setVisible')
    expect(home).toContain('aria-pressed')
    expect(home).toContain('RADAR_COPY.showAll')
    expect(home).not.toMatch(/[—–]/)
    expect(home.toLowerCase()).not.toContain('walk')
  })
})
