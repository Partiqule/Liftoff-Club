import 'server-only'

import { cookies } from 'next/headers'
import {
  ADMIN_COOKIE,
  SESSION_COOKIE,
  accessLevel,
  feedToken,
  isAdminEmail,
  readFeedToken,
  readSigned,
  sessionSecret,
  type AccessLevel,
  type AccessStatus,
} from '@/lib/pro/access-gate'
import { accessStatus, sessionEmail } from '@/lib/pro/access-store'

export type Viewer = {
  email: string | null
  status: AccessStatus | null
  level: AccessLevel
  admin: boolean
  feed?: string | null
}

export async function readViewer(request?: Request): Promise<Viewer> {
  const secret = sessionSecret()
  const jar = await cookies()
  const sessionId = readSigned(jar.get(SESSION_COOKIE)?.value ?? '', secret)
  const email = sessionId ? await sessionEmail(sessionId) : null
  const queryEmail = request ? readFeedToken(new URL(request.url).searchParams.get('access') ?? '', secret) : null
  const who = email ?? queryEmail
  const status = who ? await accessStatus(who) : null
  const adminCookie = readSigned(jar.get(ADMIN_COOKIE)?.value ?? '', secret) === 'admin'
  const level = accessLevel(status)
  return {
    email: who,
    status,
    level,
    admin: adminCookie || isAdminEmail(who),
    feed: who && level === 'full' ? feedToken(who, secret, Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 90) : null,
  }
}

export function cookieBase(maxAge: number): {
  httpOnly: true
  sameSite: 'lax'
  secure: boolean
  path: string
  maxAge: number
} {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  }
}
