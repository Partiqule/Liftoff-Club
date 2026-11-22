/**
 * One page lock shared by every globe. iOS Safari and the Capacitor WKWebView
 * keep scrolling a body that only has overflow hidden, so the lock pins the
 * body and blocks touchmove until the reader lets go.
 */
export type ScrollHost = {
  body: { style: { position: string; top: string; left: string; right: string; width: string; overflow: string } }
  documentElement: { style: { overflow: string } }
  addEventListener(type: string, listener: (event: Event) => void, options?: { passive?: boolean }): void
  removeEventListener(type: string, listener: (event: Event) => void): void
}

export type ScrollWindow = {
  scrollY: number
  scrollTo(x: number, y: number): void
  requestAnimationFrame?: (callback: () => void) => void
}

export type ScrollLock = {
  hold(doc: ScrollHost, win: ScrollWindow): () => void
  readonly holders: number
}

export function createScrollLock(): ScrollLock {
  let holders = 0
  let generation = 0
  let releaseStyles: (() => void) | null = null

  return {
    get holders() {
      return holders
    },
    hold(doc, win) {
      holders += 1
      if (holders === 1) {
        generation += 1
        const gen = generation
        releaseStyles = pin(doc, win, () => generation === gen)
      }
      let released = false
      return () => {
        if (released) return
        released = true
        holders = Math.max(0, holders - 1)
        if (holders === 0 && releaseStyles) {
          const finish = releaseStyles
          releaseStyles = null
          finish()
        }
      }
    },
  }
}

function pin(doc: ScrollHost, win: ScrollWindow, stillCurrent: () => boolean): () => void {
  const y = win.scrollY || 0
  const { body } = doc
  const root = doc.documentElement
  const previous = {
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    right: body.style.right,
    width: body.style.width,
    overflow: body.style.overflow,
    rootOverflow: root.style.overflow,
  }
  body.style.position = 'fixed'
  body.style.top = `-${y}px`
  body.style.left = '0'
  body.style.right = '0'
  body.style.width = '100%'
  body.style.overflow = 'hidden'
  root.style.overflow = 'hidden'
  const blockMove = (event: Event) => {
    event.preventDefault()
  }
  doc.addEventListener('touchmove', blockMove, { passive: false })
  return () => {
    doc.removeEventListener('touchmove', blockMove)
    body.style.position = previous.position
    body.style.top = previous.top
    body.style.left = previous.left
    body.style.right = previous.right
    body.style.width = previous.width
    body.style.overflow = previous.overflow
    root.style.overflow = previous.rootOverflow
    win.scrollTo(0, y)
    win.requestAnimationFrame?.(() => {
      if (stillCurrent()) win.scrollTo(0, y)
    })
  }
}

type Seat = { id: number; exit: () => void }

let seat: Seat | null = null
let seatSeq = 0
let shared: ScrollLock | null = null

export function sharedScrollLock(): ScrollLock {
  if (!shared) shared = createScrollLock()
  return shared
}

/** The newest globe wins. The previous one is asked to leave. */
export function claimGlobe(exit: () => void): number {
  const id = ++seatSeq
  const previous = seat
  seat = { id, exit }
  if (previous && previous.id !== id) previous.exit()
  return id
}

export function vacateGlobe(id: number) {
  if (seat?.id === id) seat = null
}

export function resetGlobeCoordinationForTests() {
  seat = null
  seatSeq = 0
  shared = null
}
