import { digestConfirmText } from '@/lib/pro/digest-model'
import { digestStoreReady, startDigestOptIn } from '@/lib/pro/digest-store'
import { notifyConfigured } from '@/lib/pro/signups'
import { normalizeEmail } from '@/lib/pro/access-gate'
import { magicLinkOrigin } from '@/lib/site'

export async function POST(request: Request) {
  if (!digestStoreReady() || !notifyConfigured()) return Response.json({ error: 'The Monday note is not set up on this copy yet.' }, { status: 503 })
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'The form was empty.' }, { status: 400 })
  }
  const email = normalizeEmail(body && typeof body === 'object' ? (body as { email?: unknown }).email : null)
  if (!email) return Response.json({ error: 'That email does not look usable.' }, { status: 400 })
  const token = await startDigestOptIn(email)
  if (!token) return Response.json({ error: 'The note store did not answer.' }, { status: 503 })
  const link = `${magicLinkOrigin()}/api/pro/digest/confirm?token=${encodeURIComponent(token)}`
  const mail = digestConfirmText(link)
  const notify = notifyConfigured()
  if (!notify) return Response.json({ error: 'The Monday note is not set up on this copy yet.' }, { status: 503 })
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${notify.key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: notify.from, to: [email], subject: mail.subject, text: mail.text }),
  }).catch(() => null)
  if (!response?.ok) return Response.json({ error: 'The confirm mail did not go out.' }, { status: 503 })
  return Response.json({ ok: true })
}
