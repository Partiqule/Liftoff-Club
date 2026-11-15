import { listSignups, signupCsv, signupsConfigured } from '@/lib/pro/signups'

export async function GET(request: Request) {
  const token = process.env.ADMIN_TOKEN?.trim()
  if (!token) return Response.json({ error: 'Not found' }, { status: 404 })
  if (request.headers.get('authorization') !== `Bearer ${token}`) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!signupsConfigured()) return Response.json({ error: 'The signup store is not set up.' }, { status: 503 })
  try {
    const csv = signupCsv(await listSignups())
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="liftoff-club-pro-signups.csv"',
      },
    })
  } catch {
    return Response.json({ error: 'The signup store did not answer.' }, { status: 503 })
  }
}
