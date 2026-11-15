export const PUSH_LAUNCHES_KEY = 'liftoff-club-push-launches-v1'
const EMPTY_IDS: string[] = []
let cachedRaw: string | null = null
let cachedIds: string[] = EMPTY_IDS

export function readFollowedLaunchIds(): string[] {
  if (typeof window === 'undefined') return cachedIds
  const raw = window.localStorage.getItem(PUSH_LAUNCHES_KEY)
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
  if (typeof window === 'undefined') return
  const next = [...new Set(ids)].slice(0, 40)
  cachedIds = next
  cachedRaw = JSON.stringify(next)
  window.localStorage.setItem(PUSH_LAUNCHES_KEY, cachedRaw)
  window.dispatchEvent(new Event('liftoff-push'))
}

export function urlBase64ToUint8Array(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4)
  const raw = window.atob(padded)
  const bytes = new Uint8Array(raw.length)
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index)
  return bytes
}

export function iosNeedsHomeScreen(): boolean {
  if (typeof navigator === 'undefined') return false
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const standalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  return ios && !standalone
}
