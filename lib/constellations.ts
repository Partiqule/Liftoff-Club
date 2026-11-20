import 'server-only'

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { CELESTRAK_FRESH_MS, SATCAT_TIMEOUT_MS, catalogCsvUrl, catalogGroupAllowed, celestrakHalted, celestrakText } from '@/lib/celestrak'
import { CONSTELLATIONS, type ConstellationProfile } from '@/lib/constellation-data'
import { countAheadThisYear, keepKnownCounts, parseCatalogCsv, tallyCatalog, type AheadLaunch, type ConstellationCounts } from '@/lib/constellation-tally'
import { runtimeCachePath } from '@/lib/runtime-cache'

const FRESH_MS = CELESTRAK_FRESH_MS
/** A miss backs off briefly. It does not wipe counts that already succeeded, and it does not retry on every view. */
const RETRY_MS = 15 * 60 * 1000

export type ConstellationCard = {
  profile: ConstellationProfile
  counts: ConstellationCounts | null
  aheadThisYear: number
  fetchedAt: string | null
}

type CacheFile = {
  fetchedAt: string
  groups: Record<string, ConstellationCounts>
  groupFetchedAt?: Record<string, string>
  missedAt?: Record<string, string>
}

function cachePath(): string {
  return runtimeCachePath('liftoff-constellation-counts.json')
}

async function readCache(): Promise<CacheFile | null> {
  try {
    const parsed = JSON.parse(await readFile(cachePath(), 'utf8')) as CacheFile
    if (!parsed || typeof parsed.fetchedAt !== 'string' || !parsed.groups) return null
    return parsed
  } catch {
    return null
  }
}

async function fetchGroup(group: string, year: number): Promise<ConstellationCounts | null> {
  if (!catalogGroupAllowed(group) || celestrakHalted()) return null
  const text = await celestrakText(catalogCsvUrl(group), { timeoutMs: SATCAT_TIMEOUT_MS })
  if (!text) return null
  const records = parseCatalogCsv(text)
  if (records.length === 0) return null
  return tallyCatalog(records, year)
}

function freshStamp(stamp: string | undefined, now: number, windowMs: number): boolean {
  if (!stamp) return false
  const at = Date.parse(stamp)
  return Number.isFinite(at) && now - at < windowMs
}

async function loadCounts(year: number): Promise<{ groups: Record<string, ConstellationCounts>; stamps: Record<string, string | null> }> {
  const cached = await readCache()
  const now = Date.now()
  let groups: Record<string, ConstellationCounts> = {}
  const groupFetchedAt: Record<string, string> = { ...(cached?.groupFetchedAt ?? {}) }
  const missedAt: Record<string, string> = { ...(cached?.missedAt ?? {}) }
  if (cached) {
    for (const [id, counts] of Object.entries(cached.groups)) {
      if (!counts || !Number.isFinite(counts.inOrbit)) continue
      groups[id] = counts
      if (!groupFetchedAt[id]) groupFetchedAt[id] = cached.fetchedAt
    }
  }
  const due = CONSTELLATIONS.filter((profile) => {
    if (groups[profile.id] && freshStamp(groupFetchedAt[profile.id], now, FRESH_MS)) return false
    if (freshStamp(missedAt[profile.id], now, RETRY_MS)) return false
    return true
  })
  // Save the smaller catalogs before the large Starlink file. A slow Starlink download must not drop the others.
  const waves = [due.filter((profile) => profile.id !== 'starlink'), due.filter((profile) => profile.id === 'starlink')]
  for (const wave of waves) {
    if (wave.length === 0) continue
    const incoming: Record<string, ConstellationCounts | null> = {}
    const results = await Promise.all(
      wave.map(async (profile) => {
        try {
          return { id: profile.id, counts: await fetchGroup(profile.celestrakGroup, year) }
        } catch {
          return { id: profile.id, counts: null as ConstellationCounts | null }
        }
      }),
    )
    const stamp = new Date().toISOString()
    for (const result of results) {
      incoming[result.id] = result.counts
      if (result.counts) {
        groupFetchedAt[result.id] = stamp
        delete missedAt[result.id]
      } else {
        // Remember the miss. Do not replace a saved tally with a zero.
        missedAt[result.id] = stamp
      }
    }
    groups = keepKnownCounts(groups, incoming)
    const file: CacheFile = { fetchedAt: stamp, groups, groupFetchedAt, missedAt }
    try {
      const filePath = cachePath()
      await mkdir(path.dirname(filePath), { recursive: true })
      await writeFile(filePath, JSON.stringify(file))
    } catch {
      // The page can still use the counts from this request.
    }
  }
  const stamps: Record<string, string | null> = {}
  for (const profile of CONSTELLATIONS) stamps[profile.id] = groups[profile.id] ? groupFetchedAt[profile.id] ?? null : null
  return { groups, stamps }
}

export async function getConstellationCards(launches: AheadLaunch[], now = Date.now()): Promise<ConstellationCard[]> {
  const year = new Date(now).getUTCFullYear()
  const loaded = await loadCounts(year)
  return CONSTELLATIONS.map((profile) => ({
    profile,
    counts: loaded.groups[profile.id]
      ? { ...loaded.groups[profile.id], latestLaunchDate: loaded.groups[profile.id].latestLaunchDate ?? null }
      : null,
    aheadThisYear: countAheadThisYear(launches, new RegExp(profile.launchPattern, 'i'), year, now),
    fetchedAt: loaded.stamps[profile.id] ?? null,
  }))
}
