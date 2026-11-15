import 'server-only'

import { apnsDeviceId, type ApnsDevice } from '@/lib/ios/apns'

const INDEX = 'apns:ids'

function redisEnv(): { url: string; token: string } | null {
  const url = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '').trim()
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '').trim()
  if (!url || !token) return null
  return { url, token }
}

async function command<T>(args: (string | number)[]): Promise<T | null> {
  const env = redisEnv()
  if (!env) return null
  const response = await fetch(env.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Redis answered ${response.status}`)
  const payload = (await response.json()) as { result?: T }
  return payload.result ?? null
}

export function apnsStoreReady(): boolean {
  return redisEnv() !== null
}

export async function saveApns(device: ApnsDevice): Promise<void> {
  const existing = await loadApns(device.id)
  const merged: ApnsDevice = existing
    ? { ...device, nets: existing.nets, statuses: existing.statuses, sent: existing.sent, launchIds: device.launchIds }
    : device
  await command(['SET', `apns:dev:${device.id}`, JSON.stringify(merged)])
  await command(['SADD', INDEX, device.id])
}

export async function loadApns(id: string): Promise<ApnsDevice | null> {
  const raw = await command<string>(['GET', `apns:dev:${id}`])
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as ApnsDevice
    if (!deviceOk(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

export async function listApns(): Promise<ApnsDevice[]> {
  const ids = (await command<string[]>(['SMEMBERS', INDEX])) ?? []
  const devices: ApnsDevice[] = []
  for (const id of ids.slice(0, 500)) {
    const device = await loadApns(id)
    if (device) devices.push(device)
  }
  return devices
}

export async function removeApns(id: string): Promise<void> {
  await command(['DEL', `apns:dev:${id}`])
  await command(['SREM', INDEX, id])
}

export async function replaceApns(device: ApnsDevice): Promise<void> {
  await command(['SET', `apns:dev:${device.id}`, JSON.stringify(device)])
}

function deviceOk(device: ApnsDevice): boolean {
  return Boolean(device?.token && device.id === apnsDeviceId(device.token))
}
