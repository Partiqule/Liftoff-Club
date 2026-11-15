import { NextResponse } from 'next/server'
import { ADMIN_COOKIE, normalizeEmail, sessionSecret, signValue } from '@/lib/pro/access-gate'
import { sendApproval, setStatus } from '@/lib/pro/access-store'
import { cookieBase, readViewer } from '@/lib/pro/viewer'
import { siteUrl } from '@/lib/site'

export async function POST(request: Request) {
  const secret = sessionSecret()
  if (!secret) return Response.json({ error: 'Sign in is not set up on this copy yet.' }, { status: 503 })
  let body: Record<string, unknown> = {}
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    body = {}
  }
  const action = typeof body.action === 'string' ? body.action : ''
  if (action === 'login') {
    const token = process.env.ADMIN_TOKEN?.trim()
    if (!token || body.token !== token) return Response.json({ error: 'That token does not match.' }, { status: 401 })
    const signed = signValue('admin', secret)
    if (!signed) return Response.json({ error: 'Sign in is not set up on this copy yet.' }, { status: 503 })
    const response = NextResponse.json({ ok: true })
    response.cookies.set(ADMIN_COOKIE, signed, cookieBase(60 * 60 * 12))
    return response
  }
  const viewer = await readViewer()
  if (!viewer.admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (action === 'logout') {
    const response = NextResponse.redirect(`${siteUrl()}/pro/admin`, 303)
    response.cookies.set(ADMIN_COOKIE, '', { ...cookieBase(0), maxAge: 0 })
    return response
  }
  const email = normalizeEmail(body.email)
  if (!email || (action !== 'approve' && action !== 'revoke')) {
    return Response.json({ error: 'Choose approve or revoke for one email.' }, { status: 400 })
  }
  const stored = await setStatus(email, action === 'approve' ? 'approved' : 'revoked')
  if (!stored) return Response.json({ error: 'The signup store did not answer.' }, { status: 503 })
  if (action === 'approve') await sendApproval(email)
  return Response.json({ ok: true })
}
