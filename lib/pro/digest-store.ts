import 'server-only'

import { newToken, normalizeEmail } from '@/lib/pro/access-gate'

const WEEK = 60 * 60 * 24 * 7

export function digestStoreReady(): boolean {
  const url = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '').trim()
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '').trim()
  return Boolean(url && token)
}

export async function startDigestOptIn(email: string): Promise<string | null> {
  const who = normalizeEmail(email)
  if (!who) return null
  const token = newToken()
  const saved = await command<string>(['SET', `pro:digest:pending:${token}`, who, 'EX', WEEK])
  return saved == null ? null : token
}

export async function confirmDigest(token: string): Promise<string | null> {
  const email = normalizeEmail(await command<string>(['GET', `pro:digest:pending:${token}`]))
  if (!email) return null
  await command(['DEL', `pro:digest:pending:${token}`])
  await command(['SADD', 'pro:digest:confirmed', email])
  await command(['SET', `pro:digest:sub:${email}`, JSON.stringify({ email, confirmedAt: new Date().toISOString() })])
  return email
}

export async function listDigestEmails(): Promise<string[]> {
  const rows = (await command<string[]>(['SMEMBERS', 'pro:digest:confirmed'])) ?? []
  return rows.map((row) => normalizeEmail(row)).filter((row): row is string => Boolean(row))
}

export async function markDigestSent(week: string): Promise<boolean> {
  const result = await command<string>(['SET', `pro:digest:sent:${week}`, '1', 'NX', 'EX', WEEK + 86_400])
  return result != null
}

async function command<T>(args: (string | number)[]): Promise<T | null> {
  const url = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '').trim()
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '').trim()
  if (!url || !token) return null
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    cache: 'no-store',
  })
  if (!response.ok) return null
  const payload = (await response.json()) as { result?: T }
  return payload.result ?? null
}
