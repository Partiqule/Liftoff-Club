import 'server-only'

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { CELESTRAK_TIMEOUT_MS, celestrakShouldHalt, haltAfterTimeout } from '@/lib/celestrak-query'

/**
 * CelesTrak asks machines to stop on a block or a server error, especially 403.
 * One of those answers closes further requests in this process and for the cooldown on disk.
 * GP data is cached for a day, longer than the two hour update, so we do not refetch the same file.
 * Sky passes never request the full Starlink element file. They use the station plus one launch.
 * The SATCAT group file is a separate catalog count and may include Starlink.
 */
const COOL_MS = 12 * 60 * 60 * 1000
const USER_AGENT = 'LiftoffClub/1.0 (family sky; cache 24h; +https://liftoffclub.app)'

export { CELESTRAK_FRESH_MS, CELESTRAK_TIMEOUT_MS, SATCAT_TIMEOUT_MS, ISS_GP_URL, catalogCsvUrl, catalogGroupAllowed, haltAfterTimeout, starlinkLaunchUrl } from '@/lib/celestrak-query'

type Halt = { until: string }

let memoryHaltUntil = 0

export function celestrakHalted(now = Date.now()): boolean {
  return memoryHaltUntil > now
}

export async function celestrakText(url: string, options?: { timeoutMs?: number }): Promise<string | null> {
  if (celestrakHalted() || (await haltActive())) return null
  let response: Response
  try {
    response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json, text/csv;q=0.9' },
      signal: AbortSignal.timeout(options?.timeoutMs ?? CELESTRAK_TIMEOUT_MS),
      cache: 'no-store',
    })
  } catch {
    // A timeout or a dropped connection is not a 403. Leave the other groups free to load.
    if (haltAfterTimeout()) await halt()
    return null
  }
  if (!response.ok) {
    if (celestrakShouldHalt(response.status)) await halt()
    return null
  }
  return response.text()
}

async function halt(): Promise<void> {
  memoryHaltUntil = Date.now() + COOL_MS
  const file = haltPath()
  try {
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, JSON.stringify({ until: new Date(memoryHaltUntil).toISOString() } satisfies Halt))
  } catch {
    // The memory flag still stops this process.
  }
}

async function haltActive(): Promise<boolean> {
  if (celestrakHalted()) return true
  try {
    const parsed = JSON.parse(await readFile(haltPath(), 'utf8')) as Halt
    const until = Date.parse(parsed.until)
    if (Number.isFinite(until) && until > Date.now()) {
      memoryHaltUntil = until
      return true
    }
  } catch {
    return false
  }
  return false
}

function haltPath(): string {
  if (process.env.VERCEL) return '/tmp/liftoff-celestrak-halt.json'
  return path.join(process.cwd(), '.cache', 'celestrak-halt.json')
}
