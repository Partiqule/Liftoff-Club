import { normalizeEmail, sessionSecret } from '@/lib/pro/access-gate'
import { sendSignIn, signInLimited } from '@/lib/pro/access-store'
import { signupsConfigured } from '@/lib/pro/signups'

export async function POST(request: Request) {
  if (!sessionSecret() || !signupsConfigured()) {
    return Response.json({ error: 'Sign in is not set up on this copy yet.' }, { status: 503 })
  }
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'The form was empty.' }, { status: 400 })
  }
  const email = normalizeEmail(body && typeof body === 'object' ? (body as { email?: unknown }).email : null)
  if (!email) return Response.json({ error: 'That email does not look usable.' }, { status: 400 })
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  if (await signInLimited(email, ip)) return Response.json({ error: 'Too many sign in notes. Try again later.' }, { status: 429 })
  const result = await sendSignIn(email)
  if (result === 'unconfigured') return Response.json({ error: 'Sign in mail is not set up on this copy yet.' }, { status: 503 })
  return Response.json({ ok: true })
}
