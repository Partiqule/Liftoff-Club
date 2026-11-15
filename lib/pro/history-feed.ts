import 'server-only'

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { HISTORY_SEARCHES, readHistoryLaunch, type HistoryLaunch } from '@/lib/pro/history'
import { mountainYear } from '@/lib/pro/time'

const FRESH_MS = 60 * 60 * 1000
const USER_AGENT = 'LiftoffClub/1.0 (pro launch history; cache 1h; +https://thespacedevs.com)'

type HistoryFile = {
  fetchedAt: string
  byId: Record<string, HistoryLaunch[] | null>
}

let memory: { expires: number; file: HistoryFile } | null = null
let pending: Promise<HistoryFile | null> | null = null

export function getConstellationHistory(now = Date.now()): Promise<HistoryFile | null> {
  if (memory && memory.expires > now) return Promise.resolve(memory.file)
  if (!pending) {
    pending = loadHistory(now).finally(() => {
      pending = null
    })
  }
  return pending
}

async function loadHistory(now: number): Promise<HistoryFile | null> {
  const cached = await readCache()
  if (cached && now - Date.parse(cached.fetchedAt) < FRESH_MS) {
    memory = { expires: now + FRESH_MS, file: cached }
    return cached
  }
  try {
    const file = await fetchHistory(now)
    await writeCache(file)
    memory = { expires: now + FRESH_MS, file }
    return file
  } catch {
    if (cached) {
      memory = { expires: now + 5 * 60 * 1000, file: cached }
      return cached
    }
    return null
  }
}

async function fetchHistory(now: number): Promise<HistoryFile> {
  const year = mountainYear(now) ?? new Date(now).getUTCFullYear()
  const byId: Record<string, HistoryLaunch[] | null> = {}
  await Promise.all(
    Object.entries(HISTORY_SEARCHES).map(async ([id, searches]) => {
      try {
        const merged = new Map<string, HistoryLaunch>()
        for (const search of searches) {
          for (const launch of await fetchSearch(search, year)) merged.set(launch.id, launch)
        }
        byId[id] = [...merged.values()]
      } catch {
        byId[id] = null
      }
    }),
  )
  if (Object.values(byId).every((flights) => flights == null)) {
    throw new Error('Launch Library history did not answer')
  }
  return { fetchedAt: new Date(now).toISOString(), byId }
}

async function fetchSearch(search: string, year: number): Promise<HistoryLaunch[]> {
  const first = new URL('https://ll.thespacedevs.com/2.3.0/launches/previous/')
  first.searchParams.set('search', search)
  first.searchParams.set('limit', '100')
  first.searchParams.set('mode', 'list')
  first.searchParams.set('ordering', '-net')
  const found: HistoryLaunch[] = []
  let url: string | null = first.toString()
  const headers: Record<string, string> = { Accept: 'application/json', 'User-Agent': USER_AGENT }
  const token = process.env.LL2_API_TOKEN?.trim()
  if (token) headers.Authorization = `Token ${token}`
  for (let page = 0; page < 3 && url; page += 1) {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(20_000), next: { revalidate: 3600 } })
    if (response.status === 429) throw new Error('Launch Library allows only a few free requests an hour')
    if (!response.ok) throw new Error(`Launch Library answered ${response.status}`)
    const body = (await response.json()) as { next?: string | null; results?: unknown }
    const batch = (Array.isArray(body.results) ? body.results : [])
      .map(readHistoryLaunch)
      .filter((launch): launch is HistoryLaunch => Boolean(launch))
    found.push(...batch)
    const oldest = batch[batch.length - 1]
    const oldestYear = oldest?.net ? mountainYear(oldest.net) : null
    if (!body.next || oldestYear == null || oldestYear < year) break
    url = body.next
  }
  return found
}

function cachePath(): string {
  if (process.env.VERCEL) return '/tmp/liftoff-pro-history.json'
  return path.join(process.cwd(), '.cache', 'pro-history.json')
}

async function readCache(): Promise<HistoryFile | null> {
  try {
    const parsed = JSON.parse(await readFile(cachePath(), 'utf8')) as HistoryFile
    if (!parsed || typeof parsed.fetchedAt !== 'string' || !parsed.byId) return null
    return parsed
  } catch {
    return null
  }
}

async function writeCache(file: HistoryFile): Promise<void> {
  try {
    const target = cachePath()
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, JSON.stringify(file))
  } catch {
    // The memory cache still covers this instance.
  }
}
