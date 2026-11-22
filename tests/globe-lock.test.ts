import { describe, expect, it } from 'vitest'
import {
  claimGlobe,
  createScrollLock,
  resetGlobeCoordinationForTests,
  vacateGlobe,
  type ScrollHost,
  type ScrollWindow,
} from '@/lib/globe-lock'

function page(scrollY = 240) {
  let y = scrollY
  const listeners: { type: string; fn: (event: Event) => void; options?: { passive?: boolean } }[] = []
  const bodyStyle = { position: '', top: '', left: '', right: '', width: '', overflow: '' }
  const rootStyle = { overflow: '' }
  const doc: ScrollHost = {
    body: { style: bodyStyle },
    documentElement: { style: rootStyle },
    addEventListener(type, fn, options) {
      listeners.push({ type, fn, options })
    },
    removeEventListener(type, fn) {
      const index = listeners.findIndex((item) => item.type === type && item.fn === fn)
      if (index >= 0) listeners.splice(index, 1)
    },
  }
  const frames: Array<() => void> = []
  const win: ScrollWindow = {
    get scrollY() {
      return y
    },
    scrollTo(_x, next) {
      y = next
    },
    requestAnimationFrame(callback) {
      frames.push(callback)
    },
  }
  return { doc, win, bodyStyle, rootStyle, listeners, frames, y: () => y }
}

describe('page scroll lock', () => {
  it('pins the body, blocks touchmove, and restores the same scroll on release', () => {
    const lock = createScrollLock()
    const view = page(480)
    const release = lock.hold(view.doc, view.win)
    expect(lock.holders).toBe(1)
    expect(view.bodyStyle.position).toBe('fixed')
    expect(view.bodyStyle.top).toBe('-480px')
    expect(view.bodyStyle.overflow).toBe('hidden')
    expect(view.rootStyle.overflow).toBe('hidden')
    expect(view.listeners).toHaveLength(1)
    expect(view.listeners[0]?.type).toBe('touchmove')
    expect(view.listeners[0]?.options).toEqual({ passive: false })
    const event = { preventDefault: () => undefined, defaultPrevented: false }
    event.preventDefault = () => {
      event.defaultPrevented = true
    }
    view.listeners[0]?.fn(event as Event)
    expect(event.defaultPrevented).toBe(true)
    const second = lock.hold(view.doc, view.win)
    expect(lock.holders).toBe(2)
    second()
    expect(view.bodyStyle.position).toBe('fixed')
    release()
    expect(lock.holders).toBe(0)
    expect(view.bodyStyle.position).toBe('')
    expect(view.bodyStyle.top).toBe('')
    expect(view.listeners).toHaveLength(0)
    expect(view.y()).toBe(480)
    view.frames[0]?.()
    expect(view.y()).toBe(480)
    release()
    expect(lock.holders).toBe(0)
  })

  it('does not release the lock because time passed', () => {
    const lock = createScrollLock()
    const view = page(90)
    const release = lock.hold(view.doc, view.win)
    expect(view.bodyStyle.position).toBe('fixed')
    release()
    const again = lock.hold(view.doc, view.win)
    expect(view.bodyStyle.top).toBe('-90px')
    again()
  })
})

describe('one globe at a time', () => {
  it('asks the previous globe to leave when another is engaged', () => {
    resetGlobeCoordinationForTests()
    const left: string[] = []
    const first = claimGlobe(() => left.push('first'))
    const second = claimGlobe(() => left.push('second'))
    expect(left).toEqual(['first'])
    expect(second).not.toBe(first)
    vacateGlobe(first)
    claimGlobe(() => left.push('third'))
    expect(left).toEqual(['first', 'second'])
  })
})
