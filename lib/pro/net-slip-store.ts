import 'server-only'

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { recordNet, type NetRecord } from '@/lib/pro/net-slips'
import type { Launch } from '@/lib/types'

const KEY = 'pro:net-slips'

export async function recordNetSlips(launches: Launch[], now = new Date()): Promise<void> {
  const previous = await readNetLog()
  const next: Record<string, NetRecord> = { ...previous }
  const at = now.toISOString()
  for (const launch of launches) {
    const current = next[launch.id] ?? { name: launch.name, rocket: launch.rocketName, provider: launch.provider.name, points: [] }
    next[launch.id] = {
      name: launch.name,
      rocket: launch.rocketName,
      provider: launch.provider.name,
      points: recordNet(current.points, launch.net, at),
    }
  }
  await writeNetLog(next)
}

export async function readNetLog(): Promise<Record<string, NetRecord>> {
  const remote = await redisGet(KEY)
  if (remote) {
    const parsed = parseLog(remote)
    if (parsed) return parsed
  }
  try {
    return parseLog(await readFile(slipPath(), 'utf8')) ?? {}
  } catch {
    return {}
  }
}

async function writeNetLog(log: Record<string, NetRecord>): Promise<void> {
  const body = JSON.stringify(log)
  await redisSet(KEY, body)
  try {
    const file = slipPath()
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, body)
  } catch {
    // Redis holds the log when the disk is not writable.
  }
}

function parseLog(raw: string | null): Record<string, NetRecord> | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Record<string, NetRecord>
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function slipPath(): string {
  if (process.env.VERCEL) return '/tmp/liftoff-net-slips.json'
  return path.join(process.cwd(), '.cache', 'net-slips.json')
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
  }).catch(() => null)
  if (!response?.ok) return null
  const payload = (await response.json()) as { result?: string | null }
  return payload.result ?? null
}

async function redisSet(key: string, value: string): Promise<void> {
  const env = redisEnv()
  if (!env) return
  await fetch(env.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['SET', key, value]),
    cache: 'no-store',
  }).catch(() => undefined)
}
