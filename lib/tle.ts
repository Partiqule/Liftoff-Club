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
    const designator = await latestStarlinkDesignator()
    const starlinkUrl = designator ? starlinkLaunchUrl(designator) : null
    const starlinkText = starlinkUrl ? await celestrakText(starlinkUrl) : null
    const starlink = selectStarlink(starlinkText ? parseGpJson(JSON.parse(starlinkText)) : []).map((sat) => ({
      ...sat,
      kind: 'starlink' as const,
    }))
    const bundle: TleBundle = {
      iss: { ...iss, kind: 'iss' },
      starlink,
      fetchedAt: new Date().toISOString(),
      source: 'live',
      notice: starlink.length === 0 ? 'Starlink orbits did not parse. Station times are still here.' : null,
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

async function latestStarlinkDesignator(): Promise<string | null> {
  try {
    const response = await fetch('https://ll.thespacedevs.com/2.3.0/launches/previous/?search=Starlink&limit=1&mode=list', {
      headers: { Accept: 'application/json', 'User-Agent': 'LiftoffClub/1.0 (family sky; cache 24h; +https://liftoffclub.app)' },
      signal: AbortSignal.timeout(12_000),
      cache: 'no-store',
    })
    if (!response.ok) return null
    const body = (await response.json()) as { results?: Array<{ launch_designator?: string }> }
    const designator = body.results?.[0]?.launch_designator
    return typeof designator === 'string' ? designator : null
  } catch {
    return null
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
