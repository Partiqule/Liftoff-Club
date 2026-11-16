import { describe, expect, it } from 'vitest'
import { timeZoneChoices } from '@/components/zone-picker'
import { homeScreenNeeded, readStorageItem } from '@/lib/push/browser'

describe('phone web view guards', () => {
  it('returns null when storage throws', () => {
    expect(
      readStorageItem(() => {
        throw new Error('SecurityError')
      }),
    ).toBeNull()
    expect(readStorageItem(() => '["launch"]')).toBe('["launch"]')
  })

  it('treats a missing media query as not installed', () => {
    const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
    expect(homeScreenNeeded(iphone, false, null)).toBe(true)
    expect(homeScreenNeeded(iphone, true, null)).toBe(false)
    expect(homeScreenNeeded(iphone, false, true)).toBe(false)
    expect(homeScreenNeeded('Mozilla/5.0 (Macintosh; Intel Mac OS X)', false, null)).toBe(false)
  })

  it('keeps a zone list when the catalog throws', () => {
    const intl = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }
    const original = intl.supportedValuesOf
    intl.supportedValuesOf = () => {
      throw new Error('NotSupportedError')
    }
    try {
      expect(timeZoneChoices()).toContain('America/Denver')
    } finally {
      intl.supportedValuesOf = original
    }
  })
})
