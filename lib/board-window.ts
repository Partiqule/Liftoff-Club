/** First paint of the public board. The rest stays on later pages of the same list. */
export const LAUNCH_BOARD_PAGE = 20

export function boardSlice<T>(items: T[], offset: number, size = LAUNCH_BOARD_PAGE): {
  items: T[]
  start: number
  nextStart: number | null
  prevStart: number | null
} {
  const safeSize = Number.isFinite(size) && size > 0 ? Math.floor(size) : LAUNCH_BOARD_PAGE
  const raw = Number.isFinite(offset) ? Math.floor(offset) : 0
  const maxStart = items.length > safeSize ? Math.floor((items.length - 1) / safeSize) * safeSize : 0
  const start = Math.min(Math.max(raw, 0), maxStart)
  return {
    items: items.slice(start, start + safeSize),
    start,
    nextStart: start + safeSize < items.length ? start + safeSize : null,
    prevStart: start > 0 ? Math.max(0, start - safeSize) : null,
  }
}
