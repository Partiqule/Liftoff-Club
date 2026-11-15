import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { normalizeLaunches } from '@/lib/normalize'

const headers = {
  Accept: 'application/json',
  'User-Agent': 'LiftoffClub/1.0 (fallback snapshot)',
}
const urls = [
  'https://ll.thespacedevs.com/2.3.0/launches/upcoming/?mode=detailed&limit=40&hide_recent_previous=true',
  'https://lldev.thespacedevs.com/2.3.0/launches/upcoming/?mode=detailed&limit=40&hide_recent_previous=true',
]

async function main() {
  let payload: { results?: unknown; count?: number } | null = null
  let used = ''
  for (const url of urls) {
    try {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(25_000) })
      if (!response.ok) {
        console.error(url, response.status)
        continue
      }
      payload = (await response.json()) as { results?: unknown; count?: number }
      used = url
      break
    } catch (error) {
      console.error(url, error instanceof Error ? error.message : error)
    }
  }

  if (!payload) {
    console.error('No launch feed available')
    process.exit(1)
  }

  const launches = normalizeLaunches(payload.results)
  if (launches.length === 0) {
    console.error('Feed parsed but no launches')
    process.exit(1)
  }
  const board = {
    launches,
    fetchedAt: new Date().toISOString(),
    source: 'fallback',
    stale: false,
    notice: null,
    total: payload.count ?? launches.length,
    snapshotFrom: used,
  }
  const file = path.join(process.cwd(), 'data', 'launches-fallback.json')
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, JSON.stringify(board))
  console.log(`Wrote ${launches.length} launches from ${used}`)
}

void main()
