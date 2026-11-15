import 'server-only'

import { normalizeFiling, type PublicFiling } from '@/lib/pro/filings-model'

const FRESH_MS = 6 * 60 * 60 * 1000
let memory: { expires: number; rows: PublicFiling[] } | null = null

export async function loadFilings(): Promise<{ rows: PublicFiling[]; notice: string | null }> {
  if (memory && memory.expires > Date.now()) return { rows: memory.rows, notice: null }
  const key = process.env.FCC_API_KEY?.trim() || 'DEMO_KEY'
  const url = `https://publicapi.fcc.gov/ecfs/filings?api_key=${encodeURIComponent(key)}&q=satellite&limit=40&sort=date_disseminated,DESC`
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'LiftoffClub/1.0 (filings; cache 6h)' },
      signal: AbortSignal.timeout(20_000),
      cache: 'no-store',
    })
    if (!response.ok) return { rows: memory?.rows ?? [], notice: 'The FCC filing list did not answer.' }
    const body = (await response.json()) as { filing?: unknown[] }
    const rows = (body.filing ?? []).map(normalizeFiling).filter((row): row is PublicFiling => Boolean(row))
    memory = { expires: Date.now() + FRESH_MS, rows }
    return { rows, notice: null }
  } catch {
    return { rows: memory?.rows ?? [], notice: 'The FCC filing list did not answer.' }
  }
}
