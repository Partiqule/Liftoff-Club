import 'server-only'

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { cache } from 'react'
import { celestrakText } from '@/lib/celestrak'
import { starlinkLaunchUrl } from '@/lib/celestrak-query'
import { runtimeCachePath } from '@/lib/runtime-cache'
import {
  SKY_HUBBLE_URL,
  SKY_STATIONS_URL,
  SKY_VISUAL_URL,
  assembleSkyElements,
  catalogNotice,
  emptyCatalogNotice,
  limitStarlinkGroups,
  recentStarlinkDesignators,
  staleCatalogNotice,
} from '@/lib/sky-catalog-model'
import type { SkyElement } from '@/lib/sky-point'
import { parseGpJson, type ParsedTle } from '@/lib/tle-select'

const FRESH_MS = 24 * 60 * 60 * 1000
const RETRY_MS = 15 * 60 * 1000
const FILE_NAME = 'liftoff-sky-finder.json'
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
let pending: Promise<SkyCatalog> | null = null

export function skyCatalogCachePath(env: { VERCEL?: string } = { VERCEL: process.env.VERCEL }, cwd = process.cwd()): string {
  return runtimeCachePath(FILE_NAME, env, cwd)
}

export const getSkyCatalog = cache(async (): Promise<SkyCatalog> => {
  if (memory && memory.expires > Date.now()) return memory.catalog
  if (!pending) {
    pending = loadCatalog().finally(() => {
      pending = null
    })
  }
  return pending
})

async function loadCatalog(): Promise<SkyCatalog> {
  const stored = await readStored()
  const age = stored ? Date.now() - Date.parse(stored.fetchedAt) : Number.POSITIVE_INFINITY
  if (stored && stored.objects.length > 0 && age >= 0 && age < FRESH_MS) {
    const catalog = serve(stored, 'cache', stored.notice)
    memory = { expires: Date.parse(stored.fetchedAt) + FRESH_MS, catalog }
    return catalog
  }
  try {
    const live = await fetchLive()
    if (!live || live.objects.length === 0) throw new Error('no orbits')
    await writeStored(live)
    const catalog = serve(live, 'live', live.notice)
    memory = { expires: Date.now() + FRESH_MS, catalog }
    return catalog
  } catch {
    if (stored && stored.objects.length > 0) {
      const catalog = serve(stored, 'cache', staleCatalogNotice(stored.fetchedAt))
      memory = { expires: Date.now() + RETRY_MS, catalog }
      return catalog
    }
    const catalog = serve(
      { objects: [], fetchedAt: new Date().toISOString(), notice: emptyCatalogNotice() },
      'none',
      emptyCatalogNotice(),
    )
    memory = { expires: Date.now() + RETRY_MS, catalog }
    return catalog
  }
}

async function fetchLive(): Promise<Stored | null> {
  const [stations, hubble, visual, starlink] = await Promise.all([
    readGp(SKY_STATIONS_URL),
    readGp(SKY_HUBBLE_URL),
    readGp(SKY_VISUAL_URL),
    Promise.race([
      readStarlink(),
      new Promise<{ state: 'fail'; sats: ParsedTle[] }>((resolve) => setTimeout(() => resolve({ state: 'fail', sats: [] }), 8_000)),
    ]),
  ])
  const objects = assembleSkyElements({
    stations: stations ?? [],
    hubble: hubble ?? [],
    visual: visual ?? [],
    starlink: starlink.sats,
  })
  if (objects.length === 0) return null
  return {
    objects,
    fetchedAt: new Date().toISOString(),
    notice: catalogNotice({
      stations: Boolean(stations && stations.length > 0),
      hubble: Boolean(hubble && hubble.length > 0),
      visual: Boolean(visual && visual.length > 0),
      starlink: starlink.state,
      hasHubble: objects.some((object) => object.kind === 'hubble'),
    }),
  }
}

async function readStarlink(): Promise<{ state: 'ok' | 'empty' | 'fail'; sats: ParsedTle[] }> {
  const designators = await fetchDesignators()
  if (designators === null) return { state: 'fail', sats: [] }
  if (designators.length === 0) return { state: 'empty', sats: [] }
  const groups: ParsedTle[][] = []
  let any = false
  for (const designator of designators) {
    const url = starlinkLaunchUrl(designator)
    if (!url) continue
    const rows = await readGp(url)
    if (!rows) continue
    any = true
    groups.push(rows.slice(0, 80))
  }
  if (!any) return { state: 'fail', sats: [] }
  const sats = limitStarlinkGroups(groups)
  return sats.length > 0 ? { state: 'ok', sats } : { state: 'empty', sats: [] }
}

async function fetchDesignators(): Promise<string[] | null> {
  try {
    const response = await fetch('https://ll.thespacedevs.com/2.3.0/launches/previous/?search=Starlink&limit=8&mode=list', {
      headers: { Accept: 'application/json', 'User-Agent': 'LiftoffClub/1.0 (family sky; cache 24h; +https://liftoffclub.app)' },
      signal: AbortSignal.timeout(12_000),
      cache: 'no-store',
    })
    if (!response.ok) return null
    const body = (await response.json()) as {
      results?: Array<{ name?: string; net?: string; status?: { name?: string }; launch_designator?: string }>
    }
    const rows = (body.results ?? []).map((row) => ({
      name: row.name,
      net: row.net,
      statusName: row.status?.name,
      designator: row.launch_designator,
    }))
    return recentStarlinkDesignators(rows, Date.now())
  } catch {
    return null
  }
}

async function readGp(url: string): Promise<ParsedTle[] | null> {
  const text = await celestrakText(url, { timeoutMs: 8_000 })
  if (!text) return null
  try {
    const rows = parseGpJson(JSON.parse(text))
    return rows.length > 0 ? rows : null
  } catch {
    return null
  }
}

function serve(stored: Stored, source: SkyCatalog['source'], notice: string | null): SkyCatalog {
  return {
    objects: stored.objects,
    fetchedAt: stored.fetchedAt,
    source,
    notice,
    credit: CREDIT,
  }
}

async function readStored(): Promise<Stored | null> {
  try {
    const parsed = JSON.parse(await readFile(skyCatalogCachePath(), 'utf8')) as Partial<Stored>
    if (!parsed || !Array.isArray(parsed.objects) || typeof parsed.fetchedAt !== 'string') return null
    const objects = parsed.objects.map(sanitizeElement).filter((object): object is SkyElement => Boolean(object))
    if (objects.length === 0) return null
    return { objects, fetchedAt: parsed.fetchedAt, notice: typeof parsed.notice === 'string' ? plain(parsed.notice) : null }
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
    // The memory copy still covers this process.
  }
}

function sanitizeElement(value: unknown): SkyElement | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Partial<SkyElement>
  if (typeof row.line1 !== 'string' || typeof row.line2 !== 'string') return null
  if (!row.line1.startsWith('1 ') || !row.line2.startsWith('2 ')) return null
  const kind = row.kind
  if (kind !== 'station' && kind !== 'hubble' && kind !== 'bright' && kind !== 'starlink') return null
  const norad = typeof row.noradId === 'string' ? row.noradId.trim() : ''
  const name = typeof row.name === 'string' ? plain(row.name) : ''
  if (!norad || !name) return null
  return { noradId: norad, name, kind, line1: row.line1.trim(), line2: row.line2.trim() }
}

function plain(text: string): string {
  return text.replace(/[—–-]/g, ' ').replace(/\s+/g, ' ').trim()
}
