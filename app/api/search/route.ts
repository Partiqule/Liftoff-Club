import { getLaunches } from '@/lib/launches'
import { searchAll } from '@/lib/search'

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q') ?? ''
  const board = await getLaunches()
  return Response.json({ hits: searchAll(query, board.launches) })
}
