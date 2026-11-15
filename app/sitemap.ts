import type { MetadataRoute } from 'next'
import { getLaunches } from '@/lib/launches'
import { siteUrl } from '@/lib/site'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const board = await getLaunches()
  const now = new Date()
  const pages = ['', '/launches', '/sky', '/brief', '/glossary', '/history', '/events', '/constellations', '/companies', '/settings', '/privacy', '/support', '/pro', '/pro/tracker', '/pro/manifest', '/pro/alerts', '/pro/watchlist', '/pro/brief', '/business', '/business/review']
  const staticPages: MetadataRoute.Sitemap = pages.map((path) => ({
    url: `${base}${path || '/'}`,
    lastModified: now,
  }))
  const launches: MetadataRoute.Sitemap = board.launches.flatMap((launch) => [
    { url: `${base}/launches/${launch.id}`, lastModified: now },
    { url: `${base}/launches/${launch.id}/day`, lastModified: now },
  ])
  return [...staticPages, ...launches]
}
