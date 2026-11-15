'use client'

import { Analytics, type BeforeSendEvent } from '@vercel/analytics/next'

/**
 * Aggregate page counts only. Query strings are stripped so a town, search, or
 * filter is not stored. There is no user id, account, or company-claim cookie.
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
  return <Analytics beforeSend={stripQuery} />
}
