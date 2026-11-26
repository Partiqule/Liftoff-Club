import { describe, expect, it } from 'vitest'
import { toHomeCard } from '@/lib/home-card'
import { makeLaunch } from './fixtures'

describe('home card', () => {
  it('keeps the fields the home screen draws and drops the long listing', () => {
    const card = toHomeCard(makeLaunch())
    expect(card.provider).toEqual({ name: 'SpaceX' })
    expect(card.padLat).toBe(28.562)
    expect(card.featured).toBe(true)
    expect(card).not.toHaveProperty('missionDescription')
    expect(card).not.toHaveProperty('manifest')
    expect(card).not.toHaveProperty('timeline')
    expect(card).not.toHaveProperty('customers')
    expect(JSON.stringify(card).length).toBeLessThan(800)
  })
})
