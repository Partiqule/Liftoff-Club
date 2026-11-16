export const PUSH_LAUNCHES_KEY = 'liftoff-club-push-launches-v1'
const EMPTY_IDS: string[] = []
let cachedRaw: string | null = null
let cachedIds: string[] = EMPTY_IDS

export function readStorageItem(read: () => string | null): string | null {
  try {
    return read()
  } catch {
    return null
  }
}

/** iPhone Safari that is not already installed. A missing media query must not throw. */
export function homeScreenNeeded(userAgent: string, standalone: boolean, mediaMatches: boolean | null): boolean {
  const ios = /iphone|ipad|ipod/i.test(userAgent)
  return ios && !standalone && mediaMatches !== true
}

export function readFollowedLaunchIds(): string[] {
  if (typeof window === 'undefined' || !window.localStorage) return cachedIds
  const raw = readStorageItem(() => window.localStorage.getItem(PUSH_LAUNCHES_KEY))
  if (raw === cachedRaw) return cachedIds
  cachedRaw = raw
  try {
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    cachedIds = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string').slice(0, 40) : EMPTY_IDS
  } catch {
    cachedIds = EMPTY_IDS
  }
  if (cachedIds.length === 0) cachedIds = EMPTY_IDS
  return cachedIds
}

export function writeFollowedLaunchIds(ids: string[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  const next = [...new Set(ids)].slice(0, 40)
  cachedIds = next
  cachedRaw = JSON.stringify(next)
  try {
    window.localStorage.setItem(PUSH_LAUNCHES_KEY, cachedRaw)
    window.dispatchEvent(new Event('liftoff-push'))
  } catch {
    // A web view can refuse storage. The page still renders.
  }
}

export function urlBase64ToUint8Array(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4)
  const raw = window.atob(padded)
  const bytes = new Uint8Array(raw.length)
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index)
  return bytes
}

export function iosNeedsHomeScreen(): boolean {
  try {
    if (typeof navigator === 'undefined' || typeof window === 'undefined') return false
    const standalone = 'standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
    const media = typeof window.matchMedia === 'function' ? window.matchMedia('(display-mode: standalone)') : null
    return homeScreenNeeded(navigator.userAgent || '', standalone, media ? media.matches : null)
  } catch {
    return false
  }
}
