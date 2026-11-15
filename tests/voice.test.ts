import { describe, expect, it } from 'vitest'
import { statusWords } from '@/components/status-stamp'
import { sanitizeSettings } from '@/lib/settings'
import { judgeSky } from '@/lib/weather'

describe('plain sky words', () => {
  it('does not leave a bare Go on a clear night', () => {
    const sky = judgeSky({ cloud: 0, precip: 0, code: 0 })
    expect(sky.call).toBe('go')
    expect(sky.label).toBe("Clear skies, it's a go.")
    expect(sky.label).not.toBe('Go')
    expect(judgeSky({ cloud: 90, precip: 0, code: 1 }).label.toLowerCase()).toContain('cloud')
  })

  it('says what a launch status means', () => {
    expect(statusWords('Go for Launch')).toBe('Ready to fly')
    expect(statusWords('Go')).toBe('Ready to fly')
    expect(statusWords('Launch Successful')).toBe('It flew')
  })
})

describe('night red', () => {
  it('stays off unless this browser saved it', () => {
    expect(sanitizeSettings({}).nightRed).toBe(false)
    expect(sanitizeSettings({ nightRed: true }).nightRed).toBe(true)
    expect(sanitizeSettings({ kidsMode: false, nightRed: true }).kidsMode).toBe(false)
  })
})
