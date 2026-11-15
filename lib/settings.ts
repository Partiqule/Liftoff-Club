import { FOLLOWS_KEY } from '@/lib/follows'
import { WORDS_KEY } from '@/lib/words'
import type { NotificationSettings, Place, Settings } from '@/lib/types'

export const SETTINGS_KEY = 'liftoff-club-v1'
export const FIRED_KEY = 'liftoff-club-fired-v1'

export const defaultNotifications: NotificationSettings = {
  enabled: false,
  leadMinutes: 60,
  providerMode: 'all',
  providers: [],
  visibleOnly: false,
  includeSky: true,
  rules: { starship: false, visibleFromHere: false, hourWithWeather: false },
}

export const defaultSettings: Settings = {
  kidsMode: true,
  nightRed: false,
  quietStart: '21:00',
  quietEnd: '07:00',
  notifications: defaultNotifications,
  location: null,
}

function isPlace(value: unknown): value is Place {
  if (!value || typeof value !== 'object') return false
  const place = value as Place
  return (
    typeof place.label === 'string' &&
    typeof place.lat === 'number' &&
    typeof place.lon === 'number' &&
    typeof place.timezone === 'string' &&
    (place.source === 'browser' || place.source === 'search') &&
    place.lat >= -90 &&
    place.lat <= 90 &&
    place.lon >= -180 &&
    place.lon <= 180
  )
}

function clock(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value) ? value : fallback
}

export function sanitizeSettings(value: unknown): Settings {
  const raw = value && typeof value === 'object' ? (value as Partial<Settings>) : {}
  const notes = raw.notifications && typeof raw.notifications === 'object' ? raw.notifications : defaultNotifications
  const lead = notes.leadMinutes
  const providerMode = notes.providerMode === 'spacex' || notes.providerMode === 'chosen' ? notes.providerMode : 'all'
  return {
    kidsMode: raw.kidsMode !== false,
    nightRed: raw.nightRed === true,
    quietStart: clock(raw.quietStart, defaultSettings.quietStart),
    quietEnd: clock(raw.quietEnd, defaultSettings.quietEnd),
    location: isPlace(raw.location) ? raw.location : null,
    notifications: {
      enabled: notes.enabled === true,
      leadMinutes: lead === 30 || lead === 180 ? lead : 60,
      providerMode,
      providers: Array.isArray(notes.providers) ? notes.providers.filter((item) => typeof item === 'string').slice(0, 24) : [],
      visibleOnly: notes.visibleOnly === true,
      includeSky: notes.includeSky !== false,
      rules: {
        starship: notes.rules?.starship === true,
        visibleFromHere: notes.rules?.visibleFromHere === true,
        hourWithWeather: notes.rules?.hourWithWeather === true,
      },
    },
  }
}

export function loadSettings(): Settings {
  if (typeof window === 'undefined') return defaultSettings
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    if (!raw) return defaultSettings
    return sanitizeSettings(JSON.parse(raw))
  } catch {
    return defaultSettings
  }
}

export function saveSettings(settings: Settings): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function loadFired(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(FIRED_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string').slice(-200) : []
  } catch {
    return []
  }
}

export function saveFired(ids: string[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(FIRED_KEY, JSON.stringify(ids.slice(-200)))
}

export function clearClubStorage(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(SETTINGS_KEY)
  window.localStorage.removeItem(FIRED_KEY)
  window.localStorage.removeItem(FOLLOWS_KEY)
  window.localStorage.removeItem(WORDS_KEY)
}
