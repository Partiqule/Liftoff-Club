import 'server-only'

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { observeSlips, type SlipPoint } from '@/lib/slip'
import type { Launch } from '@/lib/types'

export async function recordSlips(launches: Launch[], now = new Date()): Promise<void> {
  const previous = await readSlipLog()
  const next = observeSlips(previous, launches, now.toISOString())
  try {
    const file = slipPath()
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, JSON.stringify(next))
  } catch {
    // The launch page still shows the published notes on the listing.
  }
}

export async function slipsFor(id: string): Promise<SlipPoint[]> {
  const log = await readSlipLog()
  return log[id] ?? []
}

async function readSlipLog(): Promise<Record<string, SlipPoint[]>> {
  try {
    const parsed = JSON.parse(await readFile(slipPath(), 'utf8')) as Record<string, SlipPoint[]>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function slipPath(): string {
  if (process.env.VERCEL) return '/tmp/liftoff-slips.json'
  return path.join(process.cwd(), '.cache', 'slips.json')
}
