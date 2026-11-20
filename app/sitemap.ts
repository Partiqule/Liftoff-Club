import type { MetadataRoute } from 'next'
import { getLaunches } from '@/lib/launches'
import { launchLastModified } from '@/lib/sitemap-mod'
import { siteUrl } from '@/lib/site'

export const revalidate = 300

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const board = await getLaunches()
  const boardModified = launchLastModified(null, board.fetchedAt)
  const pages = ['', '/launches', '/sky', '/brief', '/glossary', '/history', '/events', '/constellations', '/companies', '/settings', '/privacy', '/support', '/pro', '/pro/tracker', '/pro/manifest', '/pro/alerts', '/pro/watchlist', '/pro/brief', '/business', '/business/review', '/pro/vehicles', '/pro/filings', '/pro/slips', '/pro/digest']
  const staticPages: MetadataRoute.Sitemap = pages.map((path) => ({
    url: `${base}${path || '/'}`,
    lastModified: boardModified,
  }))
  const launches: MetadataRoute.Sitemap = board.launches.flatMap((launch) => {
    const lastModified = launchLastModified(launch.lastUpdated, board.fetchedAt)
    return [
      { url: `${base}/launches/${launch.id}`, lastModified },
      { url: `${base}/launches/${launch.id}/day`, lastModified },
    ]
  })
  return [...staticPages, ...launches]
}
