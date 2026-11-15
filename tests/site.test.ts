import { describe, expect, it } from 'vitest'
import { CANONICAL_ORIGIN, siteUrl } from '@/lib/site'

describe('canonical site URL', () => {
  it('uses liftoffclub.app in production and keeps preview hosts on their own URL', () => {
    expect(siteUrl({})).toBe('http://localhost:3000')
    expect(siteUrl({ VERCEL_ENV: 'production' })).toBe(CANONICAL_ORIGIN)
    expect(siteUrl({ VERCEL_ENV: 'production', VERCEL_PROJECT_PRODUCTION_URL: 'liftoff-club.vercel.app' })).toBe(CANONICAL_ORIGIN)
    expect(siteUrl({ VERCEL_ENV: 'preview', VERCEL_URL: 'liftoff-club-git-example.vercel.app' })).toBe('https://liftoff-club-git-example.vercel.app')
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: 'https://liftoffclub.app/' })).toBe('https://liftoffclub.app')
  })
})