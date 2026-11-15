'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { dueAlerts } from '@/lib/alerts'
import { labelForCoords } from '@/lib/places'
import { defaultSettings, loadFired, loadSettings, saveFired, saveSettings } from '@/lib/settings'
import type { LaunchBrief, Place, Settings, SkyPass } from '@/lib/types'
import type { WeatherBundle } from '@/lib/weather'

const settingsListeners = new Set<() => void>()
let currentSettings: Settings = defaultSettings

function readSettings(): Settings {
  return currentSettings
}

function subscribeSettings(listener: () => void) {
  settingsListeners.add(listener)
  return () => settingsListeners.delete(listener)
}

function commitSettings(next: Settings) {
  currentSettings = next
  saveSettings(next)
  settingsListeners.forEach((listener) => listener())
}

function subscribeHydration() {
  return () => {}
}

const permissionListeners = new Set<() => void>()

function subscribePermission(listener: () => void) {
  permissionListeners.add(listener)
  return () => permissionListeners.delete(listener)
}

function permissionNow(): NotificationPermission | 'unsupported' {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

type SkyState = 'idle' | 'loading' | 'ready' | 'error'

type ClubValue = {
  settings: Settings
  hydrated: boolean
  briefs: LaunchBrief[]
  passes: SkyPass[]
  skyState: SkyState
  skyNotice: string | null
  weather: WeatherBundle | null
  updateSettings: (next: Settings | ((current: Settings) => Settings)) => void
  setLocation: (place: Place | null) => void
  notifyPermission: NotificationPermission | 'unsupported'
  enableNotifications: () => Promise<void>
}

const ClubContext = createContext<ClubValue | null>(null)

export function ClubProvider({ briefs, children }: { briefs: LaunchBrief[]; children: ReactNode }) {
  const settings = useSyncExternalStore(subscribeSettings, readSettings, () => defaultSettings)
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false)
  const notifyPermission = useSyncExternalStore(subscribePermission, permissionNow, () => 'unsupported' as const)
  const [passes, setPasses] = useState<SkyPass[]>([])
  const [skyState, setSkyState] = useState<SkyState>('idle')
  const [skyNotice, setSkyNotice] = useState<string | null>(null)
  const [weather, setWeather] = useState<WeatherBundle | null>(null)

  useEffect(() => {
    const stored = loadSettings()
    commitSettings({ ...stored, location: stored.location ?? defaultSettings.location })
  }, [])

  useEffect(() => {
    document.documentElement.dataset.voice = settings.kidsMode ? 'kid' : 'adult'
    document.documentElement.dataset.night = settings.nightRed ? 'red' : 'sky'
    if (settings.location) document.documentElement.dataset.place = settings.location.label
    else delete document.documentElement.dataset.place
  }, [settings])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Alerts still work from an open tab without the worker.
    })
  }, [])

  const lat = settings.location?.lat
  const lon = settings.location?.lon
  const timezone = settings.location?.timezone

  useEffect(() => {
    if (lat == null || lon == null || !timezone) return
    let cancel = false
    const place = { lat, lon, timezone }
    const timer = window.setTimeout(() => {
      if (!cancel) setSkyState('loading')
    }, 0)
    ;(async () => {
      try {
        const [tleResponse, predictMod, weatherMod] = await Promise.all([
          fetch('/api/sky/tles', { signal: AbortSignal.timeout(12_000) }).then((response) => {
            if (!response.ok) throw new Error('orbits')
            return response.json() as Promise<{
              iss?: { name: string; line1: string; line2: string }
              starlink?: Array<{ name: string; line1: string; line2: string }>
              notice?: string | null
            }>
          }),
          import('@/lib/predict'),
          import('@/lib/weather'),
        ])
        if (cancel) return
        const now = new Date()
        const issEnd = new Date(now.getTime() + 36 * 60 * 60 * 1000)
        const starEnd = new Date(now.getTime() + 20 * 60 * 60 * 1000)
        const jobs: Array<Promise<SkyPass[]>> = []
        if (tleResponse.iss?.line1 && tleResponse.iss.line2) {
          jobs.push(
            predictMod.predictPassesYielding([{ ...tleResponse.iss, kind: 'iss' }], place, now, issEnd),
          )
        }
        const starlink = (tleResponse.starlink ?? [])
          .filter((sat) => sat.line1 && sat.line2)
          .map((sat) => ({ ...sat, kind: 'starlink' as const }))
        if (starlink.length > 0) {
          jobs.push(predictMod.predictPassesYielding(starlink, place, now, starEnd))
        }
        const [found, sky] = await Promise.all([
          Promise.all(jobs).then((groups) => groups.flat()),
          weatherMod.fetchWeather(place).catch(() => null),
        ])
        if (cancel) return
        setPasses(found)
        setWeather(sky)
        setSkyNotice(tleResponse.notice ?? null)
        setSkyState('ready')
      } catch {
        if (!cancel) setSkyState('error')
      }
    })()
    return () => {
      cancel = true
      window.clearTimeout(timer)
    }
  }, [lat, lon, timezone])

  useEffect(() => {
    if (!hydrated || !settings.notifications.enabled) return
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    let stopped = false
    const tick = async () => {
      if (stopped) return
      const already = new Set(loadFired())
      const due = dueAlerts({ now: Date.now(), settings, briefs, passes, already, weather })
      if (due.length === 0) return
      const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined
      for (const alert of due) {
        try {
          if (registration) {
            await registration.showNotification(alert.title, { body: alert.body, tag: alert.id, data: { url: alert.url } })
          } else {
            new Notification(alert.title, { body: alert.body, tag: alert.id })
          }
          already.add(alert.id)
        } catch {
          // Permission can be withdrawn between checks.
        }
      }
      saveFired([...already])
    }
    void tick()
    const id = window.setInterval(() => void tick(), 30_000)
    return () => {
      stopped = true
      window.clearInterval(id)
    }
  }, [hydrated, settings, briefs, passes, weather])

  const updateSettings = useCallback((next: Settings | ((current: Settings) => Settings)) => {
    commitSettings(typeof next === 'function' ? next(readSettings()) : next)
  }, [])

  const setLocation = useCallback((place: Place | null) => {
    const next = place ?? defaultSettings.location
    commitSettings({ ...readSettings(), location: next })
    setSkyState('loading')
  }, [])

  const enableNotifications = useCallback(async () => {
    if (typeof Notification === 'undefined') return
    const permission = await Notification.requestPermission()
    permissionListeners.forEach((listener) => listener())
    if (permission === 'granted') {
      const current = readSettings()
      commitSettings({ ...current, notifications: { ...current.notifications, enabled: true } })
    }
  }, [])

  const value = useMemo<ClubValue>(
    () => ({
      settings,
      hydrated,
      briefs,
      passes,
      skyState,
      skyNotice,
      weather,
      updateSettings,
      setLocation,
      notifyPermission,
      enableNotifications,
    }),
    [settings, hydrated, briefs, passes, skyState, skyNotice, weather, updateSettings, setLocation, notifyPermission, enableNotifications],
  )

  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>
}

export function useClub(): ClubValue {
  const value = useContext(ClubContext)
  if (!value) throw new Error('useClub must be used inside ClubProvider')
  return value
}

export async function placeFromBrowser(): Promise<Place> {
  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('This browser does not share location.'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error('Location permission was declined.')), {
      enableHighAccuracy: false,
      timeout: 8_000,
      maximumAge: 5 * 60_000,
    })
  })
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  return labelForCoords(position.coords.latitude, position.coords.longitude, timezone)
}
