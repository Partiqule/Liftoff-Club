import 'server-only'

import { normalizeLaunches } from '@/lib/normalize'
import type { Launch } from '@/lib/types'

const USER_AGENT = 'LiftoffClub/1.0 (business review; cache 1h; +https://thespacedevs.com)'
const FRESH_MS = 60 * 60 * 1000

type Cached = { expires: number; launches: Launch[]; notice: string | null }
const memory = new Map<string, Cached>()

export async function pastFlightsFor(name: string, startMs: number, endMs: number): Promise<{ launches: Launch[]; notice: string | null }> {
  const key = `${name.toLowerCase()}|${startMs}|${endMs}`
  const hit = memory.get(key)
  if (hit && hit.expires > Date.now()) return { launches: hit.launches, notice: hit.notice }
  const url = new URL('https://ll.thespacedevs.com/2.3.0/launches/previous/')
  url.searchParams.set('search', name)
  url.searchParams.set('limit', '40')
  url.searchParams.set('mode', 'normal')
  url.searchParams.set('ordering', '-net')
  try {
    const headers: Record<string, string> = { Accept: 'application/json', 'User-Agent': USER_AGENT }
    const token = process.env.LL2_API_TOKEN?.trim()
    if (token) headers.Authorization = `Token ${token}`
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(25_000), cache: 'no-store' })
    if (!response.ok) {
      const notice = 'The past flight list did not answer. Upcoming flights are from the current board.'
      return { launches: [], notice }
    }
    const body = (await response.json()) as { results?: unknown }
    const launches = normalizeLaunches(body.results).filter((launch) => {
      if (!launch.net) return false
      const when = Date.parse(launch.net)
      return Number.isFinite(when) && when >= startMs && when <= endMs
    })
    const value = { launches, notice: null }
    memory.set(key, { expires: Date.now() + FRESH_MS, ...value })
    return value
  } catch {
    return { launches: [], notice: 'The past flight list did not answer. Upcoming flights are from the current board.' }
  }
}
