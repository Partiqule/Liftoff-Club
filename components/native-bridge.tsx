'use client'

import { useEffect, useRef } from 'react'
import { useClub } from '@/components/club-provider'
import { readFollowedLaunchIds } from '@/lib/push/browser'
import type { Settings } from '@/lib/types'

export function NativeBridge() {
  const { settings } = useClub()
  const token = useRef<string | null>(null)
  const settingsRef = useRef(settings)

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  useEffect(() => {
    if (!window.Capacitor?.isNativePlatform?.()) return
    let remove: (() => void) | undefined
    let cancel = false
    void (async () => {
      const { PushNotifications } = await import('@capacitor/push-notifications')
      const permission = await PushNotifications.requestPermissions()
      if (cancel || permission.receive !== 'granted') return
      const handle = await PushNotifications.addListener('registration', (event) => {
        token.current = event.value
        void publish(event.value, settingsRef.current)
      })
      remove = () => {
        void handle.remove()
      }
      await PushNotifications.register()
    })()
    return () => {
      cancel = true
      remove?.()
    }
  }, [])

  useEffect(() => {
    if (!token.current || !window.Capacitor?.isNativePlatform?.()) return
    void publish(token.current, settings)
  }, [settings])

  return null
}

async function publish(device: string, settings: Settings) {
  await fetch('/api/push/apns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: device,
      launchIds: readFollowedLaunchIds(),
      quietStart: settings.quietStart,
      quietEnd: settings.quietEnd,
      timezone: settings.location?.timezone ?? 'America/Denver',
      kidsMode: settings.kidsMode,
    }),
  }).catch(() => undefined)
}
