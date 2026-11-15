import { readPushEnv } from '@/lib/push/config'
import type { StoredPush } from '@/lib/push/record'

const INDEX = 'push:ids'

async function command<T>(args: (string | number)[]): Promise<T | null> {
  const env = readPushEnv()
  if (!env) return null
  const response = await fetch(env.redisUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.redisToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Redis answered ${response.status}`)
  const payload = (await response.json()) as { result?: T }
  return payload.result ?? null
}

export async function savePush(record: StoredPush): Promise<void> {
  const existing = await loadPush(record.id)
  const merged: StoredPush = existing
    ? {
        ...record,
        nets: existing.nets,
        sent: existing.sent,
        launchIds: record.launchIds,
      }
    : record
  await command(['SET', `push:sub:${record.id}`, JSON.stringify(merged)])
  await command(['SADD', INDEX, record.id])
}

export async function loadPush(id: string): Promise<StoredPush | null> {
  const raw = await command<string>(['GET', `push:sub:${id}`])
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as StoredPush
    if (!parsed.endpoint || !parsed.id) return null
    return parsed
  } catch {
    return null
  }
}

export async function listPushes(): Promise<StoredPush[]> {
  const ids = (await command<string[]>(['SMEMBERS', INDEX])) ?? []
  const records: StoredPush[] = []
  for (const id of ids.slice(0, 500)) {
    const record = await loadPush(id)
    if (record) records.push(record)
  }
  return records
}

export async function removePush(id: string): Promise<void> {
  await command(['DEL', `push:sub:${id}`])
  await command(['SREM', INDEX, id])
}

export async function replacePush(record: StoredPush): Promise<void> {
  await command(['SET', `push:sub:${record.id}`, JSON.stringify(record)])
}
