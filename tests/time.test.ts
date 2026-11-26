import { describe, expect, it } from 'vitest'
import { formatWhen, LOCAL_TIME_FALLBACK, textWhenReady } from '@/lib/time'

const NET = '2026-11-13T22:47:36Z'

describe('visitor launch time', () => {
  it('holds a stable fallback until the client zone is ready', () => {
    const held = textWhenReady(NET, 'UTC', false, (iso, zone) => formatWhen(iso, zone))
    expect(held).toBe(LOCAL_TIME_FALLBACK)
    expect(held).toBe('Local time')
    expect(held).not.toMatch(/UTC|22:47|10:47/)
    expect(textWhenReady(null, 'America/New_York', true, (iso, zone) => formatWhen(iso, zone))).toBe('Time not set')
    expect(textWhenReady('nope', 'America/New_York', true, (iso, zone) => formatWhen(iso, zone))).toBe('Time not set')
  })

  it('formats the clock in the visitor zone and adds a short zone label', () => {
    const losAngeles = formatWhen(NET, 'America/Los_Angeles')
    const newYork = formatWhen(NET, 'America/New_York')
    expect(losAngeles).toMatch(/2:47/)
    expect(losAngeles).toMatch(/PST|PDT|GMT-8/)
    expect(losAngeles).not.toMatch(/\bUTC\b/)
    expect(losAngeles).not.toMatch(/10:47/)
    expect(newYork).toMatch(/5:47/)
    expect(newYork).toMatch(/EST|EDT|GMT-5/)
    expect(newYork).not.toMatch(/\bUTC\b/)
    const ready = textWhenReady(NET, 'America/Chicago', true, (iso, zone) => formatWhen(iso, zone))
    expect(ready).toMatch(/4:47/)
    expect(ready).toMatch(/CST|CDT|GMT-6/)
  })
})
