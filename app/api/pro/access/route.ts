import { markPending } from '@/lib/pro/access-store'
import { notifySignup, rememberSignup, validateSignup, type SignupRecord } from '@/lib/pro/signups'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'The form was empty.' }, { status: 400 })
  }
  const honeypot = body && typeof body === 'object' ? (body as { website?: unknown }).website : ''
  const parsed = validateSignup(body, honeypot)
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 })
  if ('ignored' in parsed) return Response.json({ ok: true })
  const row: SignupRecord = { ...parsed.value, createdAt: new Date().toISOString() }
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  try {
    const result = await rememberSignup(row, ip)
    if (result === 'unconfigured') return Response.json({ error: 'Early access is not open on this copy yet.' }, { status: 503 })
    if (result === 'limited') return Response.json({ error: 'Too many notes from this network. Try again later.' }, { status: 429 })
  } catch {
    return Response.json({ error: 'The signup store did not answer.' }, { status: 503 })
  }
  await markPending(row.email)
  await notifySignup(row)
  return Response.json({ ok: true })
}
