import 'server-only'

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { CELESTRAK_FRESH_MS, catalogCsvUrl, catalogGroupAllowed, celestrakHalted, celestrakText } from '@/lib/celestrak'
import { CONSTELLATIONS, type ConstellationProfile } from '@/lib/constellation-data'
import { countAheadThisYear, parseCatalogCsv, tallyCatalog, type AheadLaunch, type ConstellationCounts } from '@/lib/constellation-tally'

const FRESH_MS = CELESTRAK_FRESH_MS

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
  if (!catalogGroupAllowed(group) || celestrakHalted()) return null
  const text = await celestrakText(catalogCsvUrl(group))
  if (!text) return null
  const records = parseCatalogCsv(text)
  if (records.length === 0) return null
  return tallyCatalog(records, year)
}

async function loadCounts(year: number): Promise<{ groups: Record<string, ConstellationCounts>; fetchedAt: string | null }> {
  const cached = await readCache()
  const cacheComplete = Boolean(
    cached &&
      CONSTELLATIONS.every((profile) => {
        const group = cached.groups[profile.id]
        return Boolean(group && Object.prototype.hasOwnProperty.call(group, 'latestLaunchDate'))
      }),
  )
  if (cached && cacheComplete && Date.now() - Date.parse(cached.fetchedAt) < FRESH_MS) {
    return { groups: cached.groups, fetchedAt: cached.fetchedAt }
  }
  const groups: Record<string, ConstellationCounts> = {}
  for (const profile of CONSTELLATIONS) {
    if (celestrakHalted()) break
    try {
      const counts = await fetchGroup(profile.celestrakGroup, year)
      if (counts) groups[profile.id] = counts
    } catch {
      // Leave the group blank. A failed catalog is not a count of zero.
      break
    }
  }
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
    counts: loaded.groups[profile.id]
      ? { ...loaded.groups[profile.id], latestLaunchDate: loaded.groups[profile.id].latestLaunchDate ?? null }
      : null,
    aheadThisYear: countAheadThisYear(launches, new RegExp(profile.launchPattern, 'i'), year, now),
    fetchedAt: loaded.fetchedAt,
  }))
}
