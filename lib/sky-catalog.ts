import 'server-only'

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { cache } from 'react'
import { celestrakText } from '@/lib/celestrak'
import { starlinkLaunchUrl } from '@/lib/celestrak-query'
import { runtimeCachePath } from '@/lib/runtime-cache'
import {
  SKY_HUBBLE_URL,
  SKY_RECENT_URL,
  SKY_STATIONS_URL,
  SKY_VISUAL_URL,
  assembleSkyElements,
  emptyCatalogNotice,
  launchDesignator,
  limitStarlinkGroups,
  mergeSkyKinds,
  recentStarlinkDesignators,
  starlinkTrainName,
  trainsFromGp,
  visitorCatalogNotice,
} from '@/lib/sky-catalog-model'
import type { SkyElement, SkyKind } from '@/lib/sky-point'
import { parseGpJson, type ParsedTle } from '@/lib/tle-select'

const FILE_NAME = 'liftoff-sky-finder.json'
const SHARED_KEY = 'sky:finder'
const CREDIT = 'Orbit data from CelesTrak.'

export type SkyCatalog = {
  objects: SkyElement[]
  fetchedAt: string
  source: 'live' | 'cache' | 'none'
  notice: string | null
  credit: string
}

type Stored = {
  objects: SkyElement[]
  fetchedAt: string
  notice: string | null
}

let memory: { expires: number; catalog: SkyCatalog } | null = null

export function skyCatalogCachePath(env: { VERCEL?: string } = { VERCEL: process.env.VERCEL }, cwd = process.cwd()): string {
  return runtimeCachePath(FILE_NAME, env, cwd)
}

/** Visitors only read the saved file. They do not call CelesTrak. */
export const getSkyCatalog = cache(async (): Promise<SkyCatalog> => {
  if (memory && memory.expires > Date.now()) return memory.catalog
  const stored = (await readStored()) ?? (await readShared())
  if (stored && stored.objects.length > 0) {
    await writeStored(stored)
    const catalog = serve(stored, 'cache')
    memory = { expires: Date.now() + 10 * 60 * 1000, catalog }
    return catalog
  }
  return serve({ objects: [], fetchedAt: new Date().toISOString(), notice: emptyCatalogNotice() }, 'none')
})

/** Daily job. A failed fetch keeps the previous file. */
export async function refreshSkyCatalog(): Promise<{ ok: boolean; objects: number; starlink: number; trains: string[] }> {
  const previous = (await readStored()) ?? (await readShared())
  const previousObjects = previous?.objects ?? []
  try {
    const dates = await launchDates()
    const [stations, hubble, visual, starlink] = await Promise.all([
      readGp(SKY_STATIONS_URL, 20_000),
      readGp(SKY_HUBBLE_URL, 20_000),
      readGp(SKY_VISUAL_URL, 20_000),
      readStarlink(dates),
    ])
    const built = assembleSkyElements({
      stations: stations ?? [],
      hubble: hubble ?? [],
      visual: visual ?? [],
      starlink: starlink ?? [],
    })
    const ofKind = (kind: SkyKind, loaded: unknown): SkyElement[] | null => (loaded ? built.filter((object) => object.kind === kind) : null)
    const objects = mergeSkyKinds(previousObjects, {
      station: ofKind('station', stations),
      hubble: ofKind('hubble', hubble),
      bright: ofKind('bright', visual),
      starlink: ofKind('starlink', starlink),
    })
    if (objects.length === 0) return { ok: false, objects: 0, starlink: 0, trains: [] }
    const stored: Stored = { objects, fetchedAt: new Date().toISOString(), notice: null }
    await writeStored(stored)
    await writeShared(stored)
    memory = { expires: Date.now() + 10 * 60 * 1000, catalog: serve(stored, 'live') }
    const trains = [...new Set(objects.filter((object) => object.kind === 'starlink').map((object) => object.name))]
    return { ok: true, objects: objects.length, starlink: objects.filter((object) => object.kind === 'starlink').length, trains }
  } catch {
    if (previousObjects.length > 0) {
      return {
        ok: true,
        objects: previousObjects.length,
        starlink: previousObjects.filter((object) => object.kind === 'starlink').length,
        trains: [...new Set(previousObjects.filter((object) => object.kind === 'starlink').map((object) => object.name))],
      }
    }
    return { ok: false, objects: 0, starlink: 0, trains: [] }
  }
}

async function readStarlink(dates: { dates: Record<string, string>; designators: string[] | null }): Promise<SkyElement[] | null> {
  const recentText = await celestrakText(SKY_RECENT_URL, { timeoutMs: 25_000 })
  if (recentText) {
    try {
      const rows = JSON.parse(recentText) as unknown
      if (Array.isArray(rows)) {
        const trains = trainsFromGp(rows, dates.dates)
        if (trains.length > 0) return toElements(trains)
      }
    } catch {
      // Fall through to one launch file at a time.
    }
  }
  if (!dates.designators) return null
  const groups: ParsedTle[][] = []
  for (const designator of dates.designators) {
    const url = starlinkLaunchUrl(designator)
    if (!url) continue
    const rows = await readGp(url, 12_000)
    if (!rows) continue
    const named = limitStarlinkGroups([rows.filter((sat) => /starlink/i.test(sat.name))], 12).map((sat) => ({
      ...sat,
      name: starlinkTrainName(dates.dates[launchDesignator(designator) ?? designator] ?? null),
    }))
    if (named.length > 0) groups.push(named)
  }
  const flat = groups.flat()
  return flat.length > 0 ? toElements(flat) : []
}

async function launchDates(): Promise<{ dates: Record<string, string>; designators: string[] | null }> {
  try {
    const response = await fetch('https://ll.thespacedevs.com/2.3.0/launches/previous/?search=Starlink&limit=12&mode=list', {
      headers: { Accept: 'application/json', 'User-Agent': 'LiftoffClub/1.0 (family sky; cache 24h; +https://liftoffclub.app)' },
      signal: AbortSignal.timeout(8_000),
      cache: 'no-store',
    })
    if (!response.ok) return { dates: {}, designators: null }
    const body = (await response.json()) as {
      results?: Array<{ name?: string; net?: string; status?: { name?: string }; launch_designator?: string }>
    }
    const rows = (body.results ?? []).map((row) => ({
      name: row.name,
      net: row.net,
      statusName: row.status?.name,
      designator: row.launch_designator,
    }))
    const dates: Record<string, string> = {}
    for (const row of rows) {
      const designator = row.designator ? launchDesignator(row.designator) : null
      if (designator && row.net) dates[designator] = row.net
    }
    return { dates, designators: recentStarlinkDesignators(rows, Date.now()) }
  } catch {
    return { dates: {}, designators: null }
  }
}

function toElements(sats: ParsedTle[]): SkyElement[] {
  return assembleSkyElements({ stations: [], hubble: [], visual: [], starlink: sats })
}

async function readGp(url: string, timeoutMs: number): Promise<ParsedTle[] | null> {
  const text = await celestrakText(url, { timeoutMs })
  if (!text) return null
  try {
    const rows = parseGpJson(JSON.parse(text))
    return rows.length > 0 ? rows : null
  } catch {
    return null
  }
}

function serve(stored: Stored, source: SkyCatalog['source']): SkyCatalog {
  return {
    objects: stored.objects,
    fetchedAt: stored.fetchedAt,
    source,
    notice: visitorCatalogNotice(stored.objects.length),
    credit: CREDIT,
  }
}

async function readStored(): Promise<Stored | null> {
  try {
    return parseStored(await readFile(skyCatalogCachePath(), 'utf8'))
  } catch {
    return null
  }
}

async function writeStored(stored: Stored): Promise<void> {
  try {
    const file = skyCatalogCachePath()
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, JSON.stringify(stored))
  } catch {
    // The shared copy still covers other instances.
  }
}

function sharedEnv(): { url: string; token: string } | null {
  const url = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '').trim()
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '').trim()
  if (!url || !token) return null
  return { url, token }
}

async function readShared(): Promise<Stored | null> {
  const env = sharedEnv()
  if (!env) return null
  try {
    const response = await fetch(env.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['GET', SHARED_KEY]),
      cache: 'no-store',
      signal: AbortSignal.timeout(4_000),
    })
    if (!response.ok) return null
    const payload = (await response.json()) as { result?: string | null }
    if (!payload.result) return null
    return parseStored(payload.result)
  } catch {
    return null
  }
}

async function writeShared(stored: Stored): Promise<void> {
  const env = sharedEnv()
  if (!env) return
  try {
    await fetch(env.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['SET', SHARED_KEY, JSON.stringify(stored)]),
      cache: 'no-store',
      signal: AbortSignal.timeout(4_000),
    })
  } catch {
    // /tmp still serves this instance.
  }
}

function parseStored(raw: string): Stored | null {
  try {
    const parsed = JSON.parse(raw) as Partial<Stored>
    if (!parsed || !Array.isArray(parsed.objects) || typeof parsed.fetchedAt !== 'string') return null
    const objects = parsed.objects.map(sanitizeElement).filter((object): object is SkyElement => Boolean(object))
    if (objects.length === 0) return null
    return { objects, fetchedAt: parsed.fetchedAt, notice: null }
  } catch {
    return null
  }
}

function sanitizeElement(value: unknown): SkyElement | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Partial<SkyElement>
  if (typeof row.line1 !== 'string' || typeof row.line2 !== 'string') return null
  if (!row.line1.startsWith('1 ') || !row.line2.startsWith('2 ')) return null
  const kind = row.kind
  if (!isKind(kind)) return null
  const norad = typeof row.noradId === 'string' ? row.noradId.trim() : ''
  const name = typeof row.name === 'string' ? row.name.replace(/[—–-]/g, ' ').replace(/\s+/g, ' ').trim() : ''
  if (!norad || !name) return null
  return { noradId: norad, name, kind, line1: row.line1.trim(), line2: row.line2.trim() }
}

function isKind(kind: unknown): kind is SkyKind {
  return kind === 'station' || kind === 'hubble' || kind === 'bright' || kind === 'starlink'
}
