import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const FREE_LINE = 'Free during early access.'
export const SESSION_COOKIE = 'pro_session'
export const ADMIN_COOKIE = 'pro_admin'
export const SESSION_SECONDS = 60 * 60 * 24 * 30
export const MAGIC_SECONDS = 60 * 20

export type AccessStatus = 'pending' | 'approved' | 'revoked'
export type AccessLevel = 'full' | 'preview'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function sessionSecret(env: Record<string, string | undefined> = process.env): string {
  return env.PRO_SESSION_SECRET?.trim() ?? ''
}

export const SIGN_IN_READY = 'Check your email for your sign in link.'

export const WELCOME_COPY = {
  title: "You're in",
  body: 'The desk is open. Free during early access.',
  close: 'Open the desk',
} as const

export const EXPIRED_COPY = {
  title: 'This link is finished',
  body: 'It was already used, or it is too old. Send a fresh link to your email.',
  button: 'Email a fresh link',
} as const

/** Signed in visitors see the desk. Everyone else can request access. */
export function deskChrome(level: AccessLevel): { requestAccess: boolean; signOut: boolean } {
  return level === 'full' ? { requestAccess: false, signOut: true } : { requestAccess: true, signOut: false }
}

/** A confirm click on a preview host is sent to the live site before the token is used. */
export function forwardMagicLink(requestUrl: string): string | null {
  let url: URL
  try {
    url = new URL(requestUrl)
  } catch {
    return null
  }
  if (/localhost|127\.0\.0\.1/i.test(url.hostname) || url.hostname === 'liftoffclub.app') return null
  const forward = new URL('https://liftoffclub.app/api/pro/sign-in/confirm')
  const token = url.searchParams.get('token')
  if (token) forward.searchParams.set('token', token)
  return forward.toString()
}

export function signInResult(input: { email: string | null; saved: boolean; signed: string | null }): { path: string; cookie: boolean } {
  if (input.email && input.saved && input.signed) return { path: '/pro?in=1', cookie: true }
  return { path: '/pro?in=expired', cookie: false }
}

/** Unset means auto approve. Set to false, 0, no, or off to hold new notes for the admin page. */
export function autoApprove(env: Record<string, string | undefined> = process.env): boolean {
  const raw = env.PRO_AUTO_APPROVE?.trim().toLowerCase()
  if (!raw) return true
  return !['0', 'false', 'no', 'off'].includes(raw)
}

export function adminEmailList(env: Record<string, string | undefined> = process.env): string[] {
  const listed = (env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => EMAIL.test(item))
  const notify = normalizeEmail(env.PRO_NOTIFY_EMAIL)
  return notify && !listed.includes(notify) ? [...listed, notify] : listed
}

export function isAdminEmail(email: string | null, env: Record<string, string | undefined> = process.env): boolean {
  if (!email) return false
  return adminEmailList(env).includes(email.trim().toLowerCase())
}

export function accessLevel(status: AccessStatus | null): AccessLevel {
  return status === 'approved' ? 'full' : 'preview'
}

export function previewSlice<T>(items: T[], level: AccessLevel, count = 3): T[] {
  return level === 'full' ? items : items.slice(0, count)
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  return EMAIL.test(email) && email.length <= 120 ? email : null
}

export function signValue(value: string, secret: string): string | null {
  if (!secret) return null
  const mac = createHmac('sha256', secret).update(value).digest('base64url')
  return `${value}.${mac}`
}

export function readSigned(token: string, secret: string): string | null {
  if (!secret || !token) return null
  const cut = token.lastIndexOf('.')
  if (cut <= 0) return null
  const value = token.slice(0, cut)
  const mac = token.slice(cut + 1)
  const expected = createHmac('sha256', secret).update(value).digest('base64url')
  const left = Buffer.from(mac)
  const right = Buffer.from(expected)
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null
  return value
}

export function newToken(): string {
  return randomBytes(24).toString('base64url')
}

export function feedToken(email: string, secret: string, expSeconds: number): string | null {
  return signValue(`${email}|${expSeconds}`, secret)
}

export function readFeedToken(token: string, secret: string, nowSeconds = Math.floor(Date.now() / 1000)): string | null {
  const value = readSigned(token, secret)
  if (!value) return null
  const cut = value.lastIndexOf('|')
  if (cut <= 0) return null
  const email = normalizeEmail(value.slice(0, cut))
  const exp = Number(value.slice(cut + 1))
  if (!email || !Number.isFinite(exp) || exp < nowSeconds) return null
  return email
}

export function signInMail(link: string): { subject: string; text: string } {
  return {
    subject: 'Sign in to Liftoff Club Pro',
    text: [`Sign in to Liftoff Club Pro`, FREE_LINE, '', 'Open this link. It works once and expires in 20 minutes.', link, '', 'Full desks open after approval. The family site does not use an account.'].join('\n'),
  }
}

export function approvalMail(link: string): { subject: string; text: string } {
  return {
    subject: 'Your Liftoff Club Pro desk is open',
    text: [`Your Liftoff Club Pro desk is open`, FREE_LINE, '', 'Sign in with this link. It works once and expires in 20 minutes.', link].join('\n'),
  }
}

export function commerceFree(text: string): boolean {
  return !/\b(price|prices|payment|payments|\$\d)/i.test(text)
}
