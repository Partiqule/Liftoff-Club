import { NextResponse } from 'next/server'
import {
  SESSION_COOKIE,
  SESSION_SECONDS,
  forwardMagicLink,
  newToken,
  sessionSecret,
  signInResult,
  signValue,
} from '@/lib/pro/access-gate'
import { saveSession, takeMagic } from '@/lib/pro/access-store'
import { cookieBase } from '@/lib/pro/viewer'

export async function GET(request: Request) {
  const forward = forwardMagicLink(request.url)
  if (forward) return NextResponse.redirect(forward)
  const token = new URL(request.url).searchParams.get('token') ?? ''
  const secret = sessionSecret()
  const email = token && secret ? await takeMagic(token) : null
  const id = newToken()
  const saved = Boolean(email && secret && (await saveSession(id, email)))
  const signed = email && secret ? signValue(id, secret) : null
  const result = signInResult({ email, saved, signed })
  const response = NextResponse.redirect(new URL(result.path, request.url))
  if (result.cookie && signed) response.cookies.set(SESSION_COOKIE, signed, cookieBase(SESSION_SECONDS))
  return response
}
