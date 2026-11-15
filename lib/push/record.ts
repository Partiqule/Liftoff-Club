import { createHash } from 'node:crypto'

export type PushSubscriptionKeys = {
  endpoint: string
  p256dh: string
  auth: string
}

export type StoredPush = PushSubscriptionKeys & {
  id: string
  launchIds: string[]
  nets: Record<string, string | null>
  sent: Record<string, string[]>
  quietStart: string
  quietEnd: string
  timezone: string
  paused: boolean
}

const MAX_LAUNCHES = 40

export function subscriptionId(endpoint: string): string {
  return createHash('sha256').update(endpoint).digest('hex').slice(0, 32)
}

export function parseSubscribe(body: unknown, kidsMode: boolean): { ok: true; value: StoredPush } | { ok: false; error: string; status: number } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Missing subscription.', status: 400 }
  const raw = body as Record<string, unknown>
  const subscription = raw.subscription
  if (!subscription || typeof subscription !== 'object') return { ok: false, error: 'Missing subscription.', status: 400 }
  const sub = subscription as Record<string, unknown>
  const keys = sub.keys && typeof sub.keys === 'object' ? (sub.keys as Record<string, unknown>) : null
  const endpoint = typeof sub.endpoint === 'string' ? sub.endpoint.trim() : ''
  const p256dh = typeof keys?.p256dh === 'string' ? keys.p256dh.trim() : ''
  const auth = typeof keys?.auth === 'string' ? keys.auth.trim() : ''
  if (!endpoint.startsWith('https://') || !p256dh || !auth) return { ok: false, error: 'That subscription is not usable.', status: 400 }
  const launchIds = Array.isArray(raw.launchIds)
    ? [...new Set(raw.launchIds.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()))].slice(0, MAX_LAUNCHES)
    : []
  const quietStart = clock(raw.quietStart, '21:00')
  const quietEnd = clock(raw.quietEnd, '07:00')
  const timezone = typeof raw.timezone === 'string' && raw.timezone.length < 80 ? raw.timezone : 'America/Denver'
  return {
    ok: true,
    value: {
      id: subscriptionId(endpoint),
      endpoint,
      p256dh,
      auth,
      launchIds,
      nets: {},
      sent: {},
      quietStart,
      quietEnd,
      timezone,
      paused: kidsMode,
    },
  }
}

function clock(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value) ? value : fallback
}
