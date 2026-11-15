import 'server-only'

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

export type PublicPad = {
  id: string
  name: string
  location: string
  sourceUrl: string
}

export type PadBoard = {
  pads: PublicPad[]
  fetchedAt: string | null
  notice: string | null
}

const URL = 'https://ll.thespacedevs.com/2.3.0/pads/?search=Starbase&limit=20'
const FRESH_MS = 6 * 60 * 60 * 1000
let memory: { expires: number; board: PadBoard } | null = null

export async function getPads(): Promise<PadBoard> {
  const now = Date.now()
  if (memory && memory.expires > now) return memory.board
  const cached = await readCache()
  if (cached && cached.fetchedAt && Date.now() - Date.parse(cached.fetchedAt) < FRESH_MS) {
    memory = { expires: Date.now() + FRESH_MS, board: cached }
    return cached
  }
  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': 'LiftoffClub/1.0 (family launch companion; cache 6h; +https://thespacedevs.com)',
    }
    const token = process.env.LL2_API_TOKEN?.trim()
    if (token) headers.Authorization = `Token ${token}`
    const response = await fetch(URL, { headers, signal: AbortSignal.timeout(20_000), next: { revalidate: 21600 } })
    if (!response.ok) throw new Error(`Launch Library answered ${response.status}`)
    const body = (await response.json()) as { results?: unknown }
    const pads = normalizePads(body.results)
    const board: PadBoard = {
      pads,
      fetchedAt: new Date().toISOString(),
      notice: pads.length === 0 ? 'Launch Library returned no pad named Starbase.' : null,
    }
    await writeCache(board)
    memory = { expires: Date.now() + FRESH_MS, board }
    return board
  } catch (error) {
    if (cached) return { ...cached, notice: 'Showing saved Starbase pads. The live pad list did not answer.' }
    const message = error instanceof Error ? error.message : 'The pad list did not answer.'
    return { pads: [], fetchedAt: null, notice: `Starbase pads are not loaded (${message}).` }
  }
}

export function normalizePads(values: unknown): PublicPad[] {
  if (!Array.isArray(values)) return []
  const pads: PublicPad[] = []
  for (const value of values) {
    if (!value || typeof value !== 'object') continue
    const item = value as Record<string, unknown>
    const name = typeof item.name === 'string' ? item.name.trim() : ''
    if (!name) continue
    const locationRecord = item.location && typeof item.location === 'object' ? (item.location as Record<string, unknown>) : null
    const location = typeof locationRecord?.name === 'string' ? locationRecord.name.trim() : typeof item.location === 'string' ? item.location : ''
    const id = String(item.id ?? name)
    const sourceUrl = typeof item.url === 'string' && item.url.startsWith('https://') ? item.url : `https://ll.thespacedevs.com/2.3.0/pads/${id}/`
    pads.push({ id, name, location, sourceUrl })
  }
  return pads
}

function cachePath(): string {
  if (process.env.VERCEL) return '/tmp/liftoff-pads.json'
  return path.join(process.cwd(), '.cache', 'pads.json')
}

async function readCache(): Promise<PadBoard | null> {
  try {
    const parsed = JSON.parse(await readFile(cachePath(), 'utf8')) as PadBoard
    if (!Array.isArray(parsed.pads)) return null
    return parsed
  } catch {
    return null
  }
}

async function writeCache(board: PadBoard): Promise<void> {
  try {
    const file = cachePath()
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, JSON.stringify(board))
  } catch {
    // Memory still holds this copy.
  }
}
