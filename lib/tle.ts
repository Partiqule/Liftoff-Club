import 'server-only'

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { cache } from 'react'
import { CELESTRAK_FRESH_MS, ISS_GP_URL, celestrakText, starlinkLaunchUrl } from '@/lib/celestrak'
import { ISS_FALLBACK, parseGpJson, selectStarlink, type ParsedTle } from '@/lib/tle-select'

const FRESH_MS = CELESTRAK_FRESH_MS

export type TleBundle = {
  iss: ParsedTle & { kind: 'iss' }
  starlink: Array<ParsedTle & { kind: 'starlink' }>
  fetchedAt: string
  source: 'live' | 'cache' | 'fallback'
  notice: string | null
}

let memory: { expires: number; bundle: TleBundle } | null = null
let pending: Promise<TleBundle> | null = null

export const getTles = cache(async (): Promise<TleBundle> => {
  if (memory && memory.expires > Date.now()) return memory.bundle
  if (!pending) {
    pending = loadTles().finally(() => {
      pending = null
    })
  }
  return pending
})

async function loadTles(): Promise<TleBundle> {
  const cached = await readCache()
  if (cached && Date.now() - Date.parse(cached.fetchedAt) < FRESH_MS) {
    const bundle = { ...cached, source: 'cache' as const }
    memory = { expires: Date.now() + FRESH_MS, bundle }
    return bundle
  }
  try {
    const issText = await celestrakText(ISS_GP_URL)
    const iss = (issText ? parseGpJson(JSON.parse(issText))[0] : null) ?? ISS_FALLBACK
    const sats: ParsedTle[] = []
    for (const designator of await recentStarlinkDesignators()) {
      const url = starlinkLaunchUrl(designator)
      if (!url) continue
      const text = await celestrakText(url)
      if (!text) break
      sats.push(...parseGpJson(JSON.parse(text)))
    }
    const starlink = selectStarlink(sats).map((sat) => ({ ...sat, kind: 'starlink' as const }))
    const bundle: TleBundle = {
      iss: { ...iss, kind: 'iss' },
      starlink,
      fetchedAt: new Date().toISOString(),
      source: 'live',
      notice:
        starlink.length === 0
          ? 'No recent Starlink launch group was available. Station times are still here. Pass times are approximate.'
          : 'Starlink passes use satellites from recent launches only. Times are approximate.',
    }
    await writeCache(bundle)
    memory = { expires: Date.now() + FRESH_MS, bundle }
    return bundle
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'CelesTrak did not answer'
    if (cached) {
      const bundle: TleBundle = {
        ...cached,
        source: 'cache',
        notice: `Using saved orbits. Fresh elements did not load (${reason}). Times can drift a few minutes.`,
      }
      memory = { expires: Date.now() + 15 * 60 * 1000, bundle }
      return bundle
    }
    const bundle: TleBundle = {
      iss: { ...ISS_FALLBACK, kind: 'iss' },
      starlink: [],
      fetchedAt: new Date().toISOString(),
      source: 'fallback',
      notice: `Starlink did not load, and the station orbit is a saved spare (${reason}). Treat the times as a rough guide.`,
    }
    memory = { expires: Date.now() + 15 * 60 * 1000, bundle }
    return bundle
  }
}

async function recentStarlinkDesignators(): Promise<string[]> {
  try {
    const response = await fetch('https://ll.thespacedevs.com/2.3.0/launches/previous/?search=Starlink&limit=8&mode=list', {
      headers: { Accept: 'application/json', 'User-Agent': 'LiftoffClub/1.0 (family sky; cache 24h; +https://liftoffclub.app)' },
      signal: AbortSignal.timeout(12_000),
      cache: 'no-store',
    })
    if (!response.ok) return []
    const body = (await response.json()) as { results?: Array<{ name?: string; net?: string; status?: { name?: string }; launch_designator?: string }> }
    const now = Date.now()
    const found: string[] = []
    for (const row of body.results ?? []) {
      const designator = row.launch_designator
      if (!designator || !/starlink/i.test(row.name ?? '')) continue
      if (!/success/i.test(row.status?.name ?? '')) continue
      const when = row.net ? Date.parse(row.net) : NaN
      if (!Number.isFinite(when) || when > now || now - when > 4 * 24 * 60 * 60 * 1000) continue
      if (!found.includes(designator)) found.push(designator)
      if (found.length >= 3) break
    }
    return found
  } catch {
    return []
  }
}

function cachePath(): string {
  if (process.env.VERCEL) return '/tmp/liftoff-tles.json'
  return path.join(process.cwd(), '.cache', 'tles.json')
}

async function readCache(): Promise<TleBundle | null> {
  try {
    const raw = await readFile(cachePath(), 'utf8')
    const parsed = JSON.parse(raw) as TleBundle
    if (!parsed?.iss?.line1 || !parsed.iss.line2) return null
    return parsed
  } catch {
    return null
  }
}

async function writeCache(bundle: TleBundle): Promise<void> {
  try {
    const file = cachePath()
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, JSON.stringify(bundle))
  } catch {
    // Memory cache still covers this process.
  }
}
