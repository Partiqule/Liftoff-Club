import { GOV_AGENCIES, SPACE_NAICS, fromAward, type Award } from '@/lib/pro/gov'

const FRESH_MS = 6 * 60 * 60 * 1000
const SPENDING = 'https://api.usaspending.gov/api/v2/search/spending_by_award/'

export type GovBoard = {
  awards: Award[]
  fetchedAt: string
}

let memory: { expires: number; board: GovBoard } | null = null

function isoDay(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function redisEnv(): { url: string; token: string } | null {
  const url = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '').trim()
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '').trim()
  if (!url || !token) return null
  return { url, token }
}

async function redisGet(key: string): Promise<string | null> {
  const env = redisEnv()
  if (!env) return null
  const response = await fetch(env.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['GET', key]),
    cache: 'no-store',
  })
  if (!response.ok) return null
  const payload = (await response.json()) as { result?: string | null }
  return payload.result ?? null
}

async function redisSet(key: string, value: string): Promise<void> {
  const env = redisEnv()
  if (!env) return
  await fetch(env.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['SET', key, value, 'EX', Math.floor(FRESH_MS / 1000)]),
    cache: 'no-store',
  }).catch(() => undefined)
}

async function loadAwards(): Promise<Award[]> {
  const end = isoDay(0)
  const start = isoDay(730)
  const jobs = GOV_AGENCIES.flatMap((agency) =>
    SPACE_NAICS.map(async (code) => {
      const response = await fetch(SPENDING, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': 'LiftoffClub/1.0' },
        body: JSON.stringify({
          filters: {
            award_type_codes: ['A', 'B', 'C', 'D'],
            naics_codes: [code.code],
            time_period: [{ start_date: start, end_date: end }],
            agencies: [{ type: 'awarding', tier: agency.tier, name: agency.name }],
          },
          fields: ['Award ID', 'Recipient Name', 'Award Amount', 'Start Date', 'Awarding Agency', 'Awarding Sub Agency', 'generated_internal_id'],
          limit: 5,
          page: 1,
          sort: 'Start Date',
          order: 'desc',
        }),
        next: { revalidate: 21600 },
      })
      if (!response.ok) return [] as Award[]
      const payload = (await response.json()) as { results?: Parameters<typeof fromAward>[0][] }
      return (payload.results ?? [])
        .map((item) => fromAward(item, code.code))
        .filter((item): item is Award => item !== null)
    }),
  )
  const groups = await Promise.all(jobs)
  const awards: Award[] = []
  const seen = new Set<string>()
  for (const group of groups) {
    for (const award of group) {
      if (seen.has(award.id)) continue
      seen.add(award.id)
      awards.push(award)
    }
  }
  return awards.slice(0, 40)
}

export async function loadGovBoard(): Promise<GovBoard> {
  if (memory && memory.expires > Date.now()) return memory.board
  const cached = await redisGet('gov:board').catch(() => null)
  if (cached) {
    try {
      const board = JSON.parse(cached) as GovBoard
      memory = { expires: Date.now() + FRESH_MS, board }
      return board
    } catch {
      // Read a fresh board.
    }
  }
  const awards = await loadAwards().catch(() => [])
  const board: GovBoard = {
    awards,
    fetchedAt: new Date().toISOString(),
  }
  memory = { expires: Date.now() + FRESH_MS, board }
  await redisSet('gov:board', JSON.stringify(board)).catch(() => undefined)
  return board
}
