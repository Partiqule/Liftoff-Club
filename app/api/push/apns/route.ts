import { parseApnsRegister } from '@/lib/ios/apns'
import { apnsStoreReady, saveApns } from '@/lib/ios/apns-store'

export async function POST(request: Request) {
  if (!apnsStoreReady()) return Response.json({ error: 'Phone alerts are not set up on this copy yet.' }, { status: 503 })
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Missing device.' }, { status: 400 })
  }
  const kids = Boolean(body && typeof body === 'object' && (body as { kidsMode?: unknown }).kidsMode === true)
  const parsed = parseApnsRegister(body, kids)
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 })
  await saveApns(parsed.value)
  return Response.json({ ok: true })
}
