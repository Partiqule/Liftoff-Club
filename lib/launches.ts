import 'server-only'

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { cache } from 'react'
import { resolveCompany } from '@/lib/companies'
import { upcomingPageUrl } from '@/lib/launch-query'
import { normalizeLaunch, normalizeLaunches } from '@/lib/normalize'
import type { Launch, LaunchBoard } from '@/lib/types'

const USER_AGENT = 'LiftoffClub/1.0 (family launch companion; cache 1h; +https://thespacedevs.com)'
const PAGE_SIZE = 100
const MAX_PAGES = 6
export { upcomingPageUrl }
/** Recent flights the upcoming list drops once they have flown. No provider or pad filter. */
const RECENT_TESTS = [
  'https://ll.thespacedevs.com/2.3.0/launches/previous/?search=Starship&mode=normal&limit=8',
  'https://ll.thespacedevs.com/2.3.0/launches/previous/?search=New%20Shepard&mode=normal&limit=5',
]

const FRESH_MS = 50 * 60 * 1000
const STALE_OK_MS = 7 * 24 * 60 * 60 * 1000

let memory: { expires: number; board: LaunchBoard } | null = null
let pending: Promise<LaunchBoard> | null = null

/** Prebuild the near board plus named test and rideshare flights. Later flights stay on the list and render when opened. */
export function launchesToPrerender(launches: Launch[], now = Date.now()): Launch[] {
  const horizon = now + 120 * 86_400_000
  const picked = new Map<string, Launch>()
  for (const launch of launches) {
    const when = launch.net ? Date.parse(launch.net) : NaN
    const named = /starship|new shepard|transporter|bandwagon|starbase/i.test(`${launch.name} ${launch.padName} ${launch.padLocation ?? ''}`)
    if (named || !Number.isFinite(when) || when <= horizon) picked.set(launch.id, launch)
  }
  return [...picked.values()]
}

export const getLaunches = cache(async (): Promise<LaunchBoard> => {
  const now = Date.now()
  if (memory && memory.expires > now) return memory.board
  if (!pending) {
    pending = loadBoard().finally(() => {
      pending = null
    })
  }
  return pending
})

const singleCache = new Map<string, Launch>()

export async function getLaunch(id: string): Promise<Launch | null> {
  const board = await getLaunches()
  const listed = board.launches.find((launch) => launch.id === id)
  if (listed) return listed
  if (singleCache.has(id)) return singleCache.get(id) ?? null
  try {
    const headers: Record<string, string> = { Accept: 'application/json', 'User-Agent': USER_AGENT }
    const token = process.env.LL2_API_TOKEN?.trim()
    if (token) headers.Authorization = `Token ${token}`
    const response = await fetch(`https://ll.thespacedevs.com/2.3.0/launches/${id}/?mode=detailed`, {
      headers,
      signal: AbortSignal.timeout(20_000),
      next: { revalidate: 3600 },
    })
    if (!response.ok) return null
    const launch = normalizeLaunch(await response.json())
    if (!launch) return null
    singleCache.set(id, launch)
    return launch
  } catch {
    return null
  }
}

async function loadBoard(): Promise<LaunchBoard> {
  const cached = await readCache()
  if (cached && Date.now() - Date.parse(cached.fetchedAt) < FRESH_MS) {
    memory = { expires: Date.now() + FRESH_MS, board: { ...cached, source: 'cache', stale: false, notice: null } }
    return memory.board
  }
  try {
    const live = await fetchLive()
    await writeCache(live)
    memory = { expires: Date.now() + FRESH_MS, board: live }
    return live
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The launch feed did not answer.'
    if (cached) {
      const age = Date.now() - Date.parse(cached.fetchedAt)
      const board: LaunchBoard = {
        ...cached,
        source: 'cache',
        stale: age > FRESH_MS,
        notice: `The live feed is resting (${message}). Showing the board saved ${new Date(cached.fetchedAt).toUTCString()}.`,
      }
      memory = { expires: Date.now() + 5 * 60 * 1000, board }
      return board
    }
    const fallback = await readFallback(message)
    memory = { expires: Date.now() + 5 * 60 * 1000, board: fallback }
    return fallback
  }
}

async function fetchLive(): Promise<LaunchBoard> {
  const seen = new Map<string, Launch>()
  let total: number | null = null
  let upcoming = 0
  let stoppedEarly = false
  for (let page = 0; page < MAX_PAGES; page += 1) {
    let body: { count?: number; next?: string | null; results?: unknown }
    try {
      body = await fetchJson(upcomingPageUrl(page * PAGE_SIZE))
    } catch (error) {
      if (seen.size === 0) throw error
      stoppedEarly = true
      break
    }
    if (typeof body.count === 'number') total = body.count
    const launches = normalizeLaunches(body.results)
    if (launches.length === 0) break
    for (const launch of launches) seen.set(launch.id, launch)
    upcoming += launches.length
    if (launches.length < PAGE_SIZE) break
    if (total != null && upcoming >= total) break
  }
  for (const url of RECENT_TESTS) {
    try {
      const body = await fetchJson(url)
      for (const launch of normalizeLaunches(body.results)) seen.set(launch.id, launch)
    } catch {
      // The upcoming pages are the board. Recent test flights are added when the feed allows another request.
    }
  }
  const launches = [...seen.values()].sort((a, b) => {
    if (!a.net && !b.net) return a.name.localeCompare(b.name)
    if (!a.net) return 1
    if (!b.net) return -1
    return Date.parse(a.net) - Date.parse(b.net)
  })
  if (launches.length === 0) throw new Error('Launch Library returned an empty board')
  const short = stoppedEarly || (total != null && upcoming < total)
  return {
    launches,
    fetchedAt: new Date().toISOString(),
    source: 'live',
    stale: false,
    notice: short
      ? `The public list names ${total ?? 'more'} upcoming launches. This copy has ${upcoming} of them because the feed stopped early.`
      : null,
    total: total ?? upcoming,
  }
}

async function fetchJson(url: string): Promise<{ count?: number; next?: string | null; results?: unknown }> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': USER_AGENT,
  }
  const token = process.env.LL2_API_TOKEN?.trim()
  if (token) headers.Authorization = `Token ${token}`
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(25_000),
    next: { revalidate: 3600 },
  })
  if (response.status === 429) {
    throw new Error('Launch Library allows only a few free requests an hour')
  }
  if (!response.ok) throw new Error(`Launch Library answered ${response.status}`)
  return (await response.json()) as { count?: number; next?: string | null; results?: unknown }
}

function cachePath(): string {
  if (process.env.VERCEL) return '/tmp/liftoff-launches.json'
  return path.join(process.cwd(), '.cache', 'launches.json')
}

async function readCache(): Promise<LaunchBoard | null> {
  return readBoardFile(cachePath())
}

async function writeCache(board: LaunchBoard): Promise<void> {
  try {
    const file = cachePath()
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, JSON.stringify(board))
  } catch {
    // The memory cache still protects this instance.
  }
}

async function readFallback(reason: string): Promise<LaunchBoard> {
  const file = path.join(process.cwd(), 'data', 'launches-fallback.json')
  const board = await readBoardFile(file)
  if (!board) {
    return {
      launches: [],
      fetchedAt: new Date().toISOString(),
      source: 'fallback',
      stale: true,
      notice: `The launch feed is down (${reason}) and there is no saved board either.`,
      total: 0,
    }
  }
  const age = Date.now() - Date.parse(board.fetchedAt)
  return {
    ...board,
    source: 'fallback',
    stale: !Number.isFinite(age) || age > STALE_OK_MS,
    notice: `Showing a saved copy of the board from ${new Date(board.fetchedAt).toUTCString()}. The live feed is resting: ${reason}.`,
  }
}

function repairLaunch(launch: Launch): Launch {
  const providerCompany = resolveCompany(launch.provider?.name || 'Unknown provider')
  return {
    ...launch,
    provider: {
      ...launch.provider,
      companyId: launch.provider?.companyId || providerCompany.id,
    },
    webcasts: launch.webcasts ?? (launch.webcastUrl ? [{ title: launch.webcastTitle ?? 'Webcast', url: launch.webcastUrl }] : []),
    updates: launch.updates ?? [],
    boosterReused: launch.boosterReused ?? null,
    boosterCareerFlights: launch.boosterCareerFlights ?? null,
    boosterSuccessfulLandings: launch.boosterSuccessfulLandings ?? null,
    boosterAttemptedLandings: launch.boosterAttemptedLandings ?? null,
    previousFlightName: launch.previousFlightName ?? null,
    programs: launch.programs ?? [],
    manifest: (launch.manifest ?? []).map((item) => {
      const company = resolveCompany(item.company || item.name || providerCompany.name)
      return {
        ...item,
        company: item.company || company.name,
        companyId: item.companyId || company.id,
        companySlug: item.companySlug || company.slug,
      }
    }),
  }
}

async function readBoardFile(file: string): Promise<LaunchBoard | null> {
  try {
    const raw = await readFile(file, 'utf8')
    const parsed = JSON.parse(raw) as Partial<LaunchBoard> & { launches?: unknown; generatedAt?: string }
    const launches = Array.isArray(parsed.launches) ? (parsed.launches as Launch[]) : []
    const cleaned = launches
      .filter((launch) => launch && typeof launch.id === 'string' && typeof launch.name === 'string')
      .map(repairLaunch)
    if (cleaned.length === 0) return null
    return {
      launches: cleaned,
      fetchedAt: parsed.fetchedAt || parsed.generatedAt || new Date(0).toISOString(),
      source: 'cache',
      stale: false,
      notice: null,
      total: typeof parsed.total === 'number' ? parsed.total : cleaned.length,
    }
  } catch {
    return null
  }
}
