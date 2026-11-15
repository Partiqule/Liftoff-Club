import { NextResponse } from 'next/server'
import { SESSION_COOKIE, readSigned, sessionSecret } from '@/lib/pro/access-gate'
import { dropSession } from '@/lib/pro/access-store'
import { cookieBase } from '@/lib/pro/viewer'
import { siteUrl } from '@/lib/site'

export async function POST() {
  const { cookies } = await import('next/headers')
  const jar = await cookies()
  const id = readSigned(jar.get(SESSION_COOKIE)?.value ?? '', sessionSecret())
  if (id) await dropSession(id)
  const response = NextResponse.redirect(`${siteUrl()}/pro`, 303)
  response.cookies.set(SESSION_COOKIE, '', { ...cookieBase(0), maxAge: 0 })
  return response
}
