'use client'

import { useSyncExternalStore } from 'react'
import { useClub } from '@/components/club-provider'
import { readFollowedLaunchIds, writeFollowedLaunchIds } from '@/lib/push/browser'

const NO_LAUNCHES: string[] = []
import { syncPhoneAlerts, usePushReady } from '@/components/phone-alerts'

function subscribe(listener: () => void) {
  window.addEventListener('liftoff-push', listener)
  return () => window.removeEventListener('liftoff-push', listener)
}

export function LaunchRemind({ launchId }: { launchId: string }) {
  const { settings } = useClub()
  const pushReady = usePushReady()
  const followed = useSyncExternalStore(subscribe, readFollowedLaunchIds, () => NO_LAUNCHES)
  const on = followed.includes(launchId)
  if (pushReady !== 'on') return null
  if (settings.kidsMode) {
    return <p className="meta">Phone alerts stay off while kids mode is on. A parent can turn it off under For parents.</p>
  }
  return (
    <p>
      <button
        className="btn btn-quiet"
        type="button"
        aria-pressed={on}
        onClick={() => {
          const next = on ? followed.filter((id) => id !== launchId) : [...followed, launchId]
          writeFollowedLaunchIds(next)
          void syncPhoneAlerts({
            kidsMode: false,
            quietStart: settings.quietStart,
            quietEnd: settings.quietEnd,
            timezone: settings.location?.timezone ?? 'America/Denver',
          })
        }}
      >
        {on ? 'This phone will be reminded' : 'Remind this phone'}
      </button>
    </p>
  )
}
