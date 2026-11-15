import { askAboutLaunch } from '@/lib/ask'
import { getLaunch } from '@/lib/launches'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const launch = await getLaunch(id)
  if (!launch) return Response.json({ answer: 'That launch is not on the board.', source: 'listing' }, { status: 404 })
  let question = ''
  try {
    const body = (await request.json()) as { question?: unknown }
    question = typeof body.question === 'string' ? body.question.slice(0, 400) : ''
  } catch {
    question = ''
  }
  const result = await askAboutLaunch(launch, question)
  return Response.json(result)
}
