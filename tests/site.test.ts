import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { runtimeCachePath } from '@/lib/runtime-cache'
import { briefsForShell } from '@/lib/schedule'
import { launchLastModified } from '@/lib/sitemap-mod'
import { CANONICAL_ORIGIN, siteUrl } from '@/lib/site'
import { makeLaunch } from './fixtures'

describe('canonical site URL', () => {
  it('uses liftoffclub.app in production and keeps preview hosts on their own URL', () => {
    expect(siteUrl({})).toBe('http://localhost:3000')
    expect(siteUrl({ VERCEL_ENV: 'production' })).toBe(CANONICAL_ORIGIN)
    expect(siteUrl({ VERCEL_ENV: 'production', VERCEL_PROJECT_PRODUCTION_URL: 'liftoff-club.vercel.app' })).toBe(CANONICAL_ORIGIN)
    expect(siteUrl({ VERCEL_ENV: 'preview', VERCEL_URL: 'liftoff-club-git-example.vercel.app' })).toBe('https://liftoff-club-git-example.vercel.app')
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: 'https://liftoffclub.app/' })).toBe('https://liftoffclub.app')
  })
})

describe('live board cache', () => {
  it('writes constellation counts to /tmp on Vercel and keeps real sitemap times', () => {
    expect(runtimeCachePath('liftoff-constellation-counts.json', { VERCEL: '1' }, '/app')).toBe('/tmp/liftoff-constellation-counts.json')
    expect(runtimeCachePath('liftoff-constellation-counts.json', {}, '/app')).toContain('/app/.cache/liftoff-constellation-counts.json')
    const fetchedAt = '2026-11-20T18:00:00.000Z'
    const older = launchLastModified('2026-11-18T03:14:00Z', fetchedAt)
    const newer = launchLastModified('2026-11-20T16:04:00Z', fetchedAt)
    expect(older.toISOString()).toBe('2026-11-18T03:14:00.000Z')
    expect(newer.toISOString()).not.toBe(older.toISOString())
    expect(launchLastModified(null, fetchedAt).toISOString()).toBe(fetchedAt)
    const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
    const day = readFileSync(new URL('../components/launch-day.tsx', import.meta.url), 'utf8')
    expect(css).not.toMatch(/box-shadow:\s*0\s+0/)
    expect(css).not.toContain('dayglow')
    expect(day).not.toContain('dayglow')
  })

  it('keeps the next launch in the shell and leaves a flown row out', () => {
    const now = Date.parse('2026-11-20T18:00:00Z')
    const flown = makeLaunch({
      id: 'flown',
      name: 'Long March 8A | SatNet LEO Group 30',
      net: '2026-11-20T11:59:00Z',
      windowEnd: '2026-11-20T11:59:00Z',
      statusAbbrev: 'Success',
      statusName: 'Launch Successful',
      historical: true,
    })
    const next = makeLaunch({ id: 'next', name: 'Falcon 9 | USSF-317', net: '2026-11-21T04:20:00Z', windowEnd: '2026-11-21T04:20:00Z', historical: false })
    const later = makeLaunch({ id: 'later', name: 'Much later', net: '2027-06-01T00:00:00Z', windowEnd: '2027-06-01T00:00:00Z', historical: false })
    const shell = briefsForShell([flown, later, next], now)
    expect(shell.map((launch) => launch.id)).toEqual(['next'])
    expect(briefsForShell([later], now).map((launch) => launch.id)).toEqual(['later'])
  })
})