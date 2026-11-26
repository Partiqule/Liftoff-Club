import { searchPlaces } from '@/lib/places'

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q') ?? ''
  const places = await searchPlaces(query.slice(0, 80))
  return Response.json(
    { places },
    { headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' } },
  )
}
