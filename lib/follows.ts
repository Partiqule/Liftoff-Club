import type { Launch } from '@/lib/types'

export const FOLLOWS_KEY = 'liftoff-club-follows-v1'

export function toggleFollow(current: string[], slug: string): string[] {
  const clean = slug.trim()
  if (!clean) return current
  return current.includes(clean) ? current.filter((item) => item !== clean) : [...current, clean]
}

export type FollowFlight = {
  slug: string
  name: string
  launchId: string
  launchName: string
  net: string | null
  role: string
}

/** What each followed company is flying on the current board. */
export function flightsForFollows(slugs: string[], launches: Launch[]): FollowFlight[] {
  const wanted = new Set(slugs)
  const rows: FollowFlight[] = []
  for (const launch of launches) {
    const seen = new Set<string>()
    for (const item of launch.manifest) {
      if (!wanted.has(item.companySlug) || seen.has(item.companySlug)) continue
      seen.add(item.companySlug)
      rows.push({
        slug: item.companySlug,
        name: item.company,
        launchId: launch.id,
        launchName: launch.name,
        net: launch.net,
        role: item.role,
      })
    }
  }
  return rows
}
