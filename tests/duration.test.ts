import { describe, expect, it } from 'vitest'
import { parseDurationSeconds } from '@/lib/duration'

describe('parseDurationSeconds', () => {
  it('parses launch library countdown steps', () => {
    expect(parseDurationSeconds('-PT38M')).toBe(-38 * 60)
    expect(parseDurationSeconds('-PT45S')).toBe(-45)
    expect(parseDurationSeconds('PT2M26S')).toBe(2 * 60 + 26)
    expect(parseDurationSeconds('PT1M7S')).toBe(67)
    expect(parseDurationSeconds('P0D')).toBe(0)
  })

  it('rejects junk', () => {
    expect(parseDurationSeconds('tomorrow')).toBeNull()
    expect(parseDurationSeconds('')).toBeNull()
  })
})
