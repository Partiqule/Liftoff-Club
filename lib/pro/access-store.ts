import 'server-only'

import { siteUrl } from '@/lib/site'
import {
  FREE_LINE,
  MAGIC_SECONDS,
  SESSION_SECONDS,
  approvalMail,
  newToken,
  normalizeEmail,
  signInMail,
  type AccessStatus,
} from '@/lib/pro/access-gate'
import { notifyConfigured } from '@/lib/pro/signups'

function pick(env: Record<string, string | undefined>, names: string[]): string {
  for (const name of names) {
    const value = env[name]?.trim()
    if (value) return value
  }
  return ''
}

async function command<T>(args: (string | number)[]): Promise<T | null> {
  const url = pick(process.env, ['UPSTASH_REDIS_REST_URL', 'KV_REST_API_URL'])
  const token = pick(process.env, ['UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_TOKEN'])
  if (!url || !token) return null
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Store answered ${response.status}`)
  const payload = (await response.json()) as { result?: T }
  return payload.result ?? null
}

function statusKey(email: string): string {
  return `pro:status:${email}`
}

export function asStatus(value: unknown): AccessStatus | null {
  return value === 'pending' || value === 'approved' || value === 'revoked' ? value : null
}

export async function accessStatus(email: string): Promise<AccessStatus | null> {
  return asStatus(await command<string>(['GET', statusKey(email)]))
}

export async function markPending(email: string): Promise<void> {
  const current = await accessStatus(email)
  if (current === 'approved') return
  await command(['SET', statusKey(email), 'pending'])
}

export async function setStatus(email: string, status: AccessStatus): Promise<boolean> {
  const result = await command<string>(['SET', statusKey(email), status])
  return result != null
}

export async function saveSession(id: string, email: string): Promise<boolean> {
  const result = await command<string>(['SET', `pro:session:${id}`, email, 'EX', SESSION_SECONDS])
  return result != null
}

export async function sessionEmail(id: string): Promise<string | null> {
  return normalizeEmail(await command<string>(['GET', `pro:session:${id}`]))
}

export async function dropSession(id: string): Promise<void> {
  await command(['DEL', `pro:session:${id}`])
}

export async function saveMagic(email: string): Promise<string | null> {
  const token = newToken()
  const saved = await command<string>(['SET', `pro:magic:${token}`, email, 'EX', MAGIC_SECONDS])
  return saved == null ? null : token
}

export async function takeMagic(token: string): Promise<string | null> {
  const email = normalizeEmail(await command<string>(['GET', `pro:magic:${token}`]))
  if (!email) return null
  await command(['DEL', `pro:magic:${token}`])
  return email
}

export async function signInLimited(email: string, ip: string): Promise<boolean> {
  const emailKey = `pro:signin:${email}`
  const ipKey = `pro:signin-ip:${ip.slice(0, 80)}`
  const byEmail = await command<number>(['INCR', emailKey])
  const byIp = await command<number>(['INCR', ipKey])
  if (byEmail === 1) await command(['EXPIRE', emailKey, 3600])
  if (byIp === 1) await command(['EXPIRE', ipKey, 3600])
  return (byEmail ?? 0) > 5 || (byIp ?? 0) > 20
}

export function signInLink(token: string): string {
  return `${siteUrl()}/api/pro/sign-in/confirm?token=${encodeURIComponent(token)}`
}

export async function sendProMail(to: string, message: { subject: string; text: string }): Promise<boolean> {
  const notify = notifyConfigured()
  if (!notify) return false
  if (!message.text.includes(FREE_LINE)) return false
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${notify.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: notify.from, to: [to], subject: message.subject, text: message.text }),
    })
    return response.ok
  } catch {
    return false
  }
}

export async function sendSignIn(email: string): Promise<'sent' | 'unconfigured'> {
  if (!notifyConfigured()) return 'unconfigured'
  const token = await saveMagic(email)
  if (!token) return 'unconfigured'
  const sent = await sendProMail(email, signInMail(signInLink(token)))
  return sent ? 'sent' : 'unconfigured'
}

export async function sendApproval(email: string): Promise<boolean> {
  const token = await saveMagic(email)
  if (!token) return false
  return sendProMail(email, approvalMail(signInLink(token)))
}
