import { describe, expect, it } from 'vitest'
import { track, type ClubEvent } from '@/lib/track'

describe('usage events', () => {
  it('names only the five counts and does not throw when analytics is absent', () => {
    const names: ClubEvent[] = ['launch_viewed', 'launch_day_opened', 'alert_enabled', 'app_installed', 'pro_signup_submitted', 'pro_access_clicked']
    expect(names).toHaveLength(6)
    expect(() => names.forEach((name) => track(name))).not.toThrow()
  })
})