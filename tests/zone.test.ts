import { describe, expect, it } from 'vitest'
import { formatMountain, isTimeZone, zoneAbbrev } from '@/lib/pro/time'
import { sanitizeSettings } from '@/lib/settings'

describe('visitor time zone', () => {
  it('keeps Mountain Time when no zone is passed, and labels another zone', () => {
    expect(formatMountain('2026-11-13T22:47:36Z')).toMatch(/MST|MDT/)
    expect(formatMountain('2026-11-13T22:47:36Z', 'Europe/London')).toMatch(/GMT|BST/)
    expect(zoneAbbrev('America/Denver', new Date('2026-11-13T22:47:36Z'))).toMatch(/MST|MDT/)
    expect(isTimeZone('America/Denver')).toBe(true)
    expect(isTimeZone('Not/AZone')).toBe(false)
  })

  it('defaults to the device zone and can store a chosen zone', () => {
    expect(sanitizeSettings({}).zoneMode).toBe('auto')
    expect(sanitizeSettings({ zoneMode: 'chosen', zone: 'Asia/Tokyo' }).zone).toBe('Asia/Tokyo')
  })
})
