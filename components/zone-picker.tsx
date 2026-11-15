'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import { useClub } from '@/components/club-provider'
import { isTimeZone, zoneAbbrev } from '@/lib/pro/time'
import { useActiveZone } from '@/components/use-zone'

function subscribe() {
  return () => {}
}

function zones(): string[] {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }
  if (typeof intl.supportedValuesOf === 'function') return intl.supportedValuesOf('timeZone')
  return ['UTC', 'America/Denver', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Tokyo']
}

export function ZonePicker() {
  const { settings, updateSettings } = useClub()
  const active = useActiveZone()
  const [query, setQuery] = useState('')
  const all = useSyncExternalStore(subscribe, zones, () => ['America/Denver'])
  const matches = useMemo(() => {
    const text = query.trim().toLowerCase()
    const list = text ? all.filter((zone) => zone.toLowerCase().includes(text)) : all.slice(0, 8)
    return list.slice(0, 8)
  }, [all, query])

  return (
    <div>
      <p className="kicker">Time zone</p>
      <p className="lede">
        Times use {zoneAbbrev(active)} ({active}). {settings.zoneMode === 'auto' ? 'That follows this device.' : 'You chose this zone.'}
      </p>
      <button
        className="btn btn-quiet"
        type="button"
        onClick={() => updateSettings({ ...settings, zoneMode: 'auto' })}
      >
        Use this device's zone
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
