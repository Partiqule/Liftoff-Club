'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { track } from '@/lib/track'

/**
 * Aggregate page counts and a few named events. Query strings are stripped.
 * Events carry no name, email, town, or other personal field.
 * The vendor scripts load after the page, so they stay off the first paint.
 */

const VendorAnalytics = dynamic(() => import('@/components/analytics-vendor').then((mod) => mod.VendorAnalytics), { ssr: false })

export function ClubAnalytics() {
  useEffect(() => {
    const onInstalled = () => track('app_installed')
    window.addEventListener('appinstalled', onInstalled)
    return () => window.removeEventListener('appinstalled', onInstalled)
  }, [])
  return <VendorAnalytics />
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
