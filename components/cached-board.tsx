'use client'

import { useSyncExternalStore } from 'react'
import { SCHEDULE_KEY, readStoredSchedule, type IosLaunch } from '@/lib/ios/schedule'

const EMPTY_ROWS: IosLaunch[] = []
let cachedRaw: string | null = null
let cachedRows: IosLaunch[] = EMPTY_ROWS

function subscribe(): () => void {
  return () => undefined
}

function readRows(): IosLaunch[] {
  if (typeof window === 'undefined' || !window.localStorage) return cachedRows
  const raw = window.localStorage.getItem(SCHEDULE_KEY)
  if (raw === cachedRaw) return cachedRows
  cachedRaw = raw
  cachedRows = readStoredSchedule(raw)?.launches ?? EMPTY_ROWS
  return cachedRows
}

export function CachedBoard() {
  const rows = useSyncExternalStore(subscribe, readRows, () => EMPTY_ROWS)
  if (rows.length === 0) return <p className="note">No saved launch list on this device yet.</p>
  return (
    <ul className="board">
      {rows.map((launch) => (
        <li key={launch.id}>
          <a href={launch.url}>{launch.name}</a>
          <p className="meta">
            {launch.whenLabel}
            {launch.rocket ? ` · ${launch.rocket}` : ''}
          </p>
        </li>
      ))}
    </ul>
  )
}
