import 'server-only'

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { normalizeEvents, type PublicEvent } from '@/lib/event-model'

export type { PublicEvent } from '@/lib/event-model'
export { eventsForCompany, eventsForRocket, normalizeEvent, normalizeEvents } from '@/lib/event-model'

export type EventBoard = {
  events: PublicEvent[]
  fetchedAt: string | null
  notice: string | null
}

const UPCOMING = 'https://ll.thespacedevs.com/2.3.0/events/upcoming/?mode=detailed&limit=100'
const PREVIOUS = 'https://ll.thespacedevs.com/2.3.0/events/previous/?mode=detailed&limit=40&ordering=-date&type__ids=2,3,5,9,10,14,18,19,21,22,27,29,30'
const FRESH_MS = 60 * 60 * 1000
let memory: { expires: number; board: EventBoard } | null = null

export async function getEvents(): Promise<EventBoard> {
  const now = Date.now()
  if (memory && memory.expires > now) return memory.board
  const cached = await readCache()
  if (cached?.fetchedAt && Date.now() - Date.parse(cached.fetchedAt) < FRESH_MS) {
    memory = { expires: Date.now() + FRESH_MS, board: cached }
    return cached
  }
  try {
    const [upcoming, previous] = await Promise.all([fetchEvents(UPCOMING), fetchEvents(PREVIOUS)])
    const seen = new Map<string, PublicEvent>()
    for (const event of [...upcoming, ...previous]) seen.set(event.id, event)
    const events = [...seen.values()].sort((a, b) => {
      if (!a.when && !b.when) return a.name.localeCompare(b.name)
      if (!a.when) return 1
      if (!b.when) return -1
      return Date.parse(a.when) - Date.parse(b.when)
    })
    const board: EventBoard = { events, fetchedAt: new Date().toISOString(), notice: null }
    await writeCache(board)
    memory = { expires: Date.now() + FRESH_MS, board }
    return board
  } catch (error) {
    if (cached) return { ...cached, notice: 'Showing a saved event list. The live feed did not answer.' }
    const message = error instanceof Error ? error.message : 'The event feed did not answer.'
    return { events: [], fetchedAt: null, notice: `Tests and events are not loaded (${message}).` }
  }
}

async function fetchEvents(url: string): Promise<PublicEvent[]> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': 'LiftoffClub/1.0 (family launch companion; cache 1h; +https://thespacedevs.com)',
  }
  const token = process.env.LL2_API_TOKEN?.trim()
  if (token) headers.Authorization = `Token ${token}`
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(25_000), next: { revalidate: 3600 } })
  if (response.status === 429) throw new Error('Launch Library allows only a few free requests an hour')
  if (!response.ok) throw new Error(`Launch Library answered ${response.status}`)
  const body = (await response.json()) as { results?: unknown }
  return normalizeEvents(body.results)
}

function cachePath(): string {
  if (process.env.VERCEL) return '/tmp/liftoff-events.json'
  return path.join(process.cwd(), '.cache', 'events.json')
}

async function readCache(): Promise<EventBoard | null> {
  try {
    const parsed = JSON.parse(await readFile(cachePath(), 'utf8')) as EventBoard
    if (!Array.isArray(parsed.events)) return null
    return parsed
  } catch {
    return null
  }
}

async function writeCache(board: EventBoard): Promise<void> {
  try {
    const file = cachePath()
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, JSON.stringify(board))
  } catch {
    // Memory still holds this copy.
  }
}
