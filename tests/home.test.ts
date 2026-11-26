import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { HOME_COPY, missionTitle, placeLine, rocketTitle } from '@/lib/home-copy'

function read(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
}

describe('simple home', () => {
  it('keeps the new sentences free of dashes and the banned word', () => {
    for (const text of Object.values(HOME_COPY)) {
      expect(text.toLowerCase()).not.toContain('walk')
      expect(text).not.toMatch(/[—–-]/)
    }
    expect(HOME_COPY.see).toBe('Can I see it from here?')
    expect(HOME_COPY.guess).toContain('Not a promise')
  })

  it('names the rocket, the mission, and the place from the listing', () => {
    const launch = {
      rocketName: 'Falcon 9',
      name: 'Falcon 9 | Starlink Group',
      missionName: 'Starlink Group',
      padName: 'SLC-40',
      padLocation: 'Cape Canaveral, FL, USA',
    }
    expect(rocketTitle(launch)).toBe('Falcon 9')
    expect(missionTitle(launch)).toBe('Starlink Group')
    expect(placeLine(launch)).toBe('SLC-40, Cape Canaveral, FL, USA')
    expect(missionTitle({ rocketName: 'Falcon 9', name: 'Falcon 9', missionName: null })).toBeNull()
    expect(placeLine({ padName: '', padLocation: null })).toBe(HOME_COPY.placeMissing)
  })

  it('keeps the next launch and the globe on home, and moves the old blocks', () => {
    const page = read('app/page.tsx')
    const home = read('components/home-live.tsx')
    const sky = read('app/sky/page.tsx')
    const launches = read('app/launches/page.tsx')
    const card = read('components/sky-finder-card.tsx')
    const copy = read('lib/sky-point.ts')
    expect(page).not.toContain('Tonight')
    expect(page).not.toContain('TierCompare')
    expect(home).toContain('NextLaunchCard')
    expect(home).toContain('FlightRadar')
    expect(home).not.toContain('Next SpaceX')
    expect(sky).toContain('Tonight')
    expect(launches).toContain('Next SpaceX')
    expect(card).not.toContain('Thanksgiving')
    expect(copy).not.toContain('Thanksgiving')
    expect(read('components/next-launch.tsx')).toContain('VisibilityCard')
  })
})
