import { NextResponse } from 'next/server'
import { SESSION_COOKIE, SESSION_SECONDS, newToken, sessionSecret, signValue } from '@/lib/pro/access-gate'
import { saveSession, takeMagic } from '@/lib/pro/access-store'
import { cookieBase } from '@/lib/pro/viewer'
import { siteUrl } from '@/lib/site'

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') ?? ''
  const secret = sessionSecret()
  const email = token && secret ? await takeMagic(token) : null
  const back = `${siteUrl()}/pro/sign-in`
  if (!email) return NextResponse.redirect(`${back}?error=link`)
  const id = newToken()
  const saved = await saveSession(id, email)
  const signed = signValue(id, secret)
  if (!saved || !signed) return NextResponse.redirect(`${back}?error=store`)
  const response = NextResponse.redirect(`${siteUrl()}/pro`)
  response.cookies.set(SESSION_COOKIE, signed, cookieBase(SESSION_SECONDS))
  return response
}
