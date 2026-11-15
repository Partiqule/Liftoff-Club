'use client'

import { useSyncExternalStore } from 'react'
import { SCHEDULE_KEY, readStoredSchedule, type IosLaunch } from '@/lib/ios/schedule'

function subscribe(): () => void {
  return () => undefined
}

function readRows(): IosLaunch[] {
  return readStoredSchedule(localStorage.getItem(SCHEDULE_KEY))?.launches ?? []
}

export function CachedBoard() {
  const rows = useSyncExternalStore(subscribe, readRows, () => [])
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
