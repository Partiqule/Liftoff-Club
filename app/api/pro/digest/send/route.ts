import { bearerToken, githubOidcAllows, readOidcPayload } from '@/lib/push/github-oidc'
import { digestShouldSend } from '@/lib/pro/digest-model'
import { listDigestEmails, markDigestSent } from '@/lib/pro/digest-store'
import { liveDigest, liveDigestText } from '@/lib/pro/digest-live'
import { notifyConfigured } from '@/lib/pro/signups'
import { normalizeEmail } from '@/lib/pro/access-gate'

export async function POST(request: Request) {
  const header = request.headers.get('authorization')
  const token = bearerToken(header)
  const admin = Boolean(process.env.ADMIN_TOKEN?.trim() && token === process.env.ADMIN_TOKEN.trim())
  let event: string | null = null
  if (!admin) {
    const allowed = await githubOidcAllows(token).catch(() => false)
    if (!allowed) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    event = String(readOidcPayload(token)?.payload.event_name ?? '')
  }
  const now = new Date()
  if (!digestShouldSend({ event: admin ? 'workflow_dispatch' : event, admin, now })) {
    return Response.json({ ok: true, skipped: 'not the Monday hour' })
  }
  const notify = notifyConfigured()
  if (!notify) return Response.json({ error: 'Mail is not set up on this copy yet.' }, { status: 503 })
  let body: { to?: unknown; test?: unknown } = {}
  try {
    body = (await request.json()) as { to?: unknown; test?: unknown }
  } catch {
    body = {}
  }
  const testTo = admin && body.test === true ? normalizeEmail(body.to) : null
  const week = now.toISOString().slice(0, 10)
  if (!testTo) {
    const first = await markDigestSent(week)
    if (!first) return Response.json({ ok: true, skipped: 'already sent' })
  }
  const text = liveDigestText(await liveDigest(now))
  const recipients = testTo ? [testTo] : await listDigestEmails()
  let sent = 0
  for (const email of recipients) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${notify.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: notify.from, to: [email], subject: 'Liftoff Club Pro digest', text }),
    }).catch(() => null)
    if (response?.ok) sent += 1
  }
  return Response.json({ ok: true, sent })
}
