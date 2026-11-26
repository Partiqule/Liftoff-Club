import { createHash, createPrivateKey, createSign, createVerify, type KeyObject } from 'node:crypto'
import type { PushNotice } from '@/lib/push/plan'

export { shareLaunchText } from '@/lib/share-text'

export const APNS_BUNDLE_ID = 'app.liftoffclub'
export const APNS_TEAM_ID = '39AMCG49RK'

export type ApnsConfig = {
  keyId: string
  teamId: string
  bundleId: string
  privateKey: string
  host: string
}

export type ApnsDevice = {
  id: string
  token: string
  launchIds: string[]
  nets: Record<string, string | null>
  statuses?: Record<string, string | null>
  sent: Record<string, string[]>
  quietStart: string
  quietEnd: string
  timezone: string
  paused: boolean
}

const TOKEN = /^[0-9a-f]{64,200}$/i

export function readApnsEnv(env: Record<string, string | undefined> = process.env): ApnsConfig | null {
  const keyId = env.APNS_KEY_ID?.trim() ?? ''
  const privateKey = (env.APNS_PRIVATE_KEY ?? '').replace(/\\n/g, '\n').trim()
  const teamId = env.APNS_TEAM_ID?.trim() || APNS_TEAM_ID
  const bundleId = env.APNS_BUNDLE_ID?.trim() || APNS_BUNDLE_ID
  if (!/^[A-Z0-9]{10}$/.test(keyId) || !privateKey.includes('BEGIN PRIVATE KEY') || !/^[A-Z0-9]{10}$/.test(teamId)) return null
  const host = env.APNS_ENV?.trim().toLowerCase() === 'sandbox' ? 'https://api.sandbox.push.apple.com' : 'https://api.push.apple.com'
  return { keyId, teamId, bundleId, privateKey, host }
}

export function deviceToken(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const token = value.replace(/[<>\s]/g, '').toLowerCase()
  return TOKEN.test(token) ? token : null
}

export function apnsDeviceId(token: string): string {
  return createHash('sha256').update(token).digest('hex').slice(0, 32)
}

export function parseApnsRegister(body: unknown, kidsMode: boolean): { ok: true; value: ApnsDevice } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Missing device.' }
  const raw = body as Record<string, unknown>
  const token = deviceToken(raw.token)
  if (!token) return { ok: false, error: 'That device token is not usable.' }
  const launchIds = Array.isArray(raw.launchIds)
    ? [...new Set(raw.launchIds.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()))].slice(0, 40)
    : []
  return {
    ok: true,
    value: {
      id: apnsDeviceId(token),
      token,
      launchIds,
      nets: {},
      statuses: {},
      sent: {},
      quietStart: clock(raw.quietStart, '21:00'),
      quietEnd: clock(raw.quietEnd, '07:00'),
      timezone: typeof raw.timezone === 'string' && raw.timezone.length < 80 ? raw.timezone : 'America/Denver',
      paused: kidsMode || raw.kidsMode === true,
    },
  }
}

export function apnsJwt(config: ApnsConfig, now = Date.now(), sign = signEs256): string {
  const header = base64url(JSON.stringify({ alg: 'ES256', kid: config.keyId }))
  const claims = base64url(JSON.stringify({ iss: config.teamId, iat: Math.floor(now / 1000) }))
  const input = `${header}.${claims}`
  return `${input}.${sign(config.privateKey, input)}`
}

export function signEs256(privateKeyPem: string, input: string): string {
  const key = createPrivateKey(privateKeyPem)
  const signer = createSign('SHA256')
  signer.update(input)
  signer.end()
  return base64url(derToRaw(signer.sign(key)))
}

export function verifyEs256(publicKey: KeyObject, input: string, signature: string): boolean {
  const verifier = createVerify('SHA256')
  verifier.update(input)
  verifier.end()
  return verifier.verify(publicKey, rawToDer(Buffer.from(signature, 'base64url')))
}

export function apnsPayload(notice: Pick<PushNotice, 'title' | 'body' | 'url'>): string {
  return JSON.stringify({
    aps: {
      alert: { title: notice.title, body: notice.body },
      sound: 'default',
    },
    url: notice.url,
  })
}

function clock(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value) ? value : fallback
}

function base64url(value: string | Buffer): string {
  const buffer = typeof value === 'string' ? Buffer.from(value) : value
  return buffer.toString('base64url')
}

function derToRaw(der: Buffer): Buffer {
  let offset = 2
  if (der[1] & 0x80) offset = 2 + (der[1] & 0x7f)
  if (der[offset] !== 0x02) throw new Error('Bad signature')
  const rLen = der[offset + 1]
  let r = der.subarray(offset + 2, offset + 2 + rLen)
  const sStart = offset + 2 + rLen
  if (der[sStart] !== 0x02) throw new Error('Bad signature')
  const sLen = der[sStart + 1]
  let s = der.subarray(sStart + 2, sStart + 2 + sLen)
  if (r[0] === 0) r = r.subarray(1)
  if (s[0] === 0) s = s.subarray(1)
  const raw = Buffer.alloc(64)
  raw.set(r, 32 - r.length)
  raw.set(s, 64 - s.length)
  return raw
}

function rawToDer(raw: Buffer): Buffer {
  const r = trimInteger(raw.subarray(0, 32))
  const s = trimInteger(raw.subarray(32))
  const body = Buffer.concat([Buffer.from([0x02, r.length]), r, Buffer.from([0x02, s.length]), s])
  return Buffer.concat([Buffer.from([0x30, body.length]), body])
}

function trimInteger(part: Buffer): Buffer {
  let start = 0
  while (start < part.length - 1 && part[start] === 0) start += 1
  const sliced = part.subarray(start)
  if (sliced[0] & 0x80) return Buffer.concat([Buffer.from([0]), sliced])
  return Buffer.from(sliced)
}
