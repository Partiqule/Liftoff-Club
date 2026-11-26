'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import { useClub } from '@/components/club-provider'
import { isTimeZone, zoneAbbrev, zoneStatusCopy } from '@/lib/pro/time'
import { useActiveZone } from '@/components/use-zone'

function subscribe() {
  return () => {}
}

const FALLBACK_ZONES = ['UTC', 'America/Denver', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Tokyo']

/** Same length as the preview list, so the server paint does not grow when the browser catalog arrives. */
const SERVER_ZONES = [
  'UTC',
  'America/Denver',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Honolulu',
]

export function timeZoneChoices(): string[] {
  try {
    const intl = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }
    if (typeof intl.supportedValuesOf !== 'function') return FALLBACK_ZONES
    const values = intl.supportedValuesOf('timeZone')
    return Array.isArray(values) && values.length > 0 ? values : FALLBACK_ZONES
  } catch {
    return FALLBACK_ZONES
  }
}

// A new array on every read makes useSyncExternalStore render forever. The parents page then hits the error boundary and the footer jumps up.
let catalog: string[] | null = null

export function zoneCatalog(): string[] {
  if (!catalog) catalog = timeZoneChoices()
  return catalog
}

export function serverZoneCatalog(): string[] {
  return SERVER_ZONES
}

export function ZonePicker() {
  const { settings, updateSettings } = useClub()
  const active = useActiveZone()
  const [query, setQuery] = useState('')
  const all = useSyncExternalStore(subscribe, zoneCatalog, serverZoneCatalog)
  const matches = useMemo(() => {
    const text = query.trim().toLowerCase()
    const list = text ? all.filter((zone) => zone.toLowerCase().includes(text)) : all.slice(0, 8)
    return list.slice(0, 8)
  }, [all, query])

  return (
    <div>
      <p className="kicker">Time zone</p>
      <p className="lede">{zoneStatusCopy(active, settings.zoneMode, Boolean(settings.location))}</p>
      <button
        className="btn btn-quiet"
        type="button"
        onClick={() => updateSettings({ ...settings, zoneMode: 'auto' })}
      >
        {"Use this device's zone"}
      </button>
      <label>
        Search time zones
        <input className="field" value={query} placeholder="America/Denver" onChange={(event) => setQuery(event.target.value)} />
      </label>
      <ul className="results">
        {matches.map((zone) => (
          <li key={zone}>
            <button
              type="button"
              onClick={() => {
                if (!isTimeZone(zone)) return
                updateSettings({ ...settings, zoneMode: 'chosen', zone })
                setQuery('')
              }}
            >
              {zone} · {zoneAbbrev(zone)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
