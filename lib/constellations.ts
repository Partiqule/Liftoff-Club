import 'server-only'

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { CONSTELLATIONS, type ConstellationProfile } from '@/lib/constellation-data'
import { countAheadThisYear, readCatalogObject, tallyCatalog, type AheadLaunch, type ConstellationCounts } from '@/lib/constellation-tally'

const FRESH_MS = 12 * 60 * 60 * 1000
const USER_AGENT = 'LiftoffClub/1.0 (family constellation counts; cache 12h; celestrak.org)'

export type ConstellationCard = {
  profile: ConstellationProfile
  counts: ConstellationCounts | null
  aheadThisYear: number
  fetchedAt: string | null
}

type CacheFile = {
  fetchedAt: string
  groups: Record<string, ConstellationCounts>
}

function cachePath(): string {
  return path.join(process.cwd(), '.cache', 'constellation-counts.json')
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
  const url = `https://celestrak.org/satcat/records.php?GROUP=${encodeURIComponent(group)}&FORMAT=JSON`
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(25_000),
  })
  if (!response.ok) return null
  const body = (await response.json()) as unknown
  if (!Array.isArray(body)) return null
  const records = body.map(readCatalogObject).filter((record): record is NonNullable<typeof record> => Boolean(record))
  return tallyCatalog(records, year)
}

async function loadCounts(year: number): Promise<{ groups: Record<string, ConstellationCounts>; fetchedAt: string | null }> {
  const cached = await readCache()
  if (cached && Date.now() - Date.parse(cached.fetchedAt) < FRESH_MS) {
    return { groups: cached.groups, fetchedAt: cached.fetchedAt }
  }
  const groups: Record<string, ConstellationCounts> = {}
  await Promise.all(
    CONSTELLATIONS.map(async (profile) => {
      try {
        const counts = await fetchGroup(profile.celestrakGroup, year)
        if (counts) groups[profile.id] = counts
      } catch {
        // Leave the group blank. A failed catalog is not a count of zero.
      }
    }),
  )
  if (Object.keys(groups).length === 0) return { groups: cached?.groups ?? {}, fetchedAt: cached?.fetchedAt ?? null }
  const file: CacheFile = { fetchedAt: new Date().toISOString(), groups: { ...cached?.groups, ...groups } }
  try {
    const filePath = cachePath()
    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(filePath, JSON.stringify(file))
  } catch {
    // The page can still use the counts from this request.
  }
  return { groups: file.groups, fetchedAt: file.fetchedAt }
}

export async function getConstellationCards(launches: AheadLaunch[], now = Date.now()): Promise<ConstellationCard[]> {
  const year = new Date(now).getUTCFullYear()
  const loaded = await loadCounts(year)
  return CONSTELLATIONS.map((profile) => ({
    profile,
    counts: loaded.groups[profile.id] ?? null,
    aheadThisYear: countAheadThisYear(launches, new RegExp(profile.launchPattern, 'i'), year, now),
    fetchedAt: loaded.fetchedAt,
  }))
}
