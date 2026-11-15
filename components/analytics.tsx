'use client'

import { useEffect } from 'react'
import { Analytics, type BeforeSendEvent } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { track } from '@/lib/track'

/**
 * Aggregate page counts and a few named events. Query strings are stripped.
 * Events carry no name, email, town, or other personal field.
 */

function stripQuery(event: BeforeSendEvent): BeforeSendEvent {
  try {
    const url = new URL(event.url)
    url.search = ''
    url.hash = ''
    return { ...event, url: url.toString() }
  } catch {
    return event
  }
}

export function ClubAnalytics() {
  useEffect(() => {
    const onInstalled = () => track('app_installed')
    window.addEventListener('appinstalled', onInstalled)
    return () => window.removeEventListener('appinstalled', onInstalled)
  }, [])
  return (
    <>
      <Analytics beforeSend={stripQuery} />
      <SpeedInsights />
    </>
  )
}

export function LaunchViewed() {
  useEffect(() => {
    track('launch_viewed')
  }, [])
  return null
}

export function LaunchDayOpened() {
  useEffect(() => {
    track('launch_day_opened')
  }, [])
  return null
}
