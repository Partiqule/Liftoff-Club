import { pushConfigured } from '@/lib/push/config'
import { parseSubscribe, subscriptionId } from '@/lib/push/record'
import { removePush, savePush } from '@/lib/push/redis'

export async function POST(request: Request) {
  if (!pushConfigured()) return Response.json({ error: 'Phone alerts are not set up on this copy.' }, { status: 404 })
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Missing subscription.' }, { status: 400 })
  }
  const kidsMode = Boolean(body && typeof body === 'object' && (body as { kidsMode?: unknown }).kidsMode === true)
  const parsed = parseSubscribe(body, kidsMode)
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: parsed.status })
  try {
    await savePush(parsed.value)
  } catch {
    return Response.json({ error: 'The alert store did not answer.' }, { status: 503 })
  }
  return Response.json({ ok: true, id: parsed.value.id })
}

export async function DELETE(request: Request) {
  if (!pushConfigured()) return Response.json({ error: 'Phone alerts are not set up on this copy.' }, { status: 404 })
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Missing subscription.' }, { status: 400 })
  }
  const endpoint = body && typeof body === 'object' && typeof (body as { endpoint?: unknown }).endpoint === 'string' ? (body as { endpoint: string }).endpoint : ''
  if (!endpoint.startsWith('https://')) return Response.json({ error: 'Missing subscription.' }, { status: 400 })
  try {
    await removePush(subscriptionId(endpoint))
  } catch {
    return Response.json({ error: 'The alert store did not answer.' }, { status: 503 })
  }
  return Response.json({ ok: true })
}
