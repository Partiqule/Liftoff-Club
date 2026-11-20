import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { flightKind, listsStarbase } from '@/lib/flight-kind'
import { normalizeEvent } from '@/lib/event-model'
import { boardSlice } from '@/lib/board-window'
import { upcomingPageUrl } from '@/lib/launch-query'
import { normalizeLaunch } from '@/lib/normalize'
import { isRideshareLaunch } from '@/lib/pro/manifest-intel'
import { filterLaunches } from '@/lib/schedule'
import { searchAll } from '@/lib/search'
import { makeLaunch } from './fixtures'

const samples = JSON.parse(readFileSync(new URL('./fixtures/ll2-samples.json', import.meta.url), 'utf8')) as unknown[]

describe('full public board', () => {
  it('asks Launch Library for every upcoming page without a provider or pad filter', () => {
    const url = upcomingPageUrl(100)
    expect(url).toContain('offset=100')
    expect(url).toContain('limit=100')
    expect(url).toContain('hide_recent_previous=false')
    expect(url).not.toMatch(/lsp|status|orbit|pad__/)
  })

  it('keeps real rideshare, suborbital, and Starship listings', () => {
    const launches = samples.map((item) => normalizeLaunch(item)).filter((item) => item != null)
    const transporter = launches.find((item) => item.name.includes('Transporter 19'))
    const bandwagon = launches.find((item) => item.name.includes('Bandwagon 6'))
    const starship = launches.find((item) => item.name.includes('HLS'))
    const shepard = launches.find((item) => item.name.includes('New Shepard'))
    expect(transporter && isRideshareLaunch(transporter)).toBe(true)
    expect(bandwagon && isRideshareLaunch(bandwagon)).toBe(true)
    expect(transporter?.missionType).toBe('Dedicated Rideshare')
    expect(starship && flightKind(starship)).toBe('Demonstration')
    expect(shepard && flightKind(shepard)).toBe('Suborbital')
    expect(filterLaunches(launches, {}).map((item) => item.id)).toEqual(launches.map((item) => item.id))
    const starbase = makeLaunch({ padName: 'Orbital Launch Pad 1', padLocation: 'SpaceX Starbase, TX, USA' })
    expect(listsStarbase(starbase)).toBe(true)
    expect(filterLaunches([starbase, transporter!], { site: 'starbase' }).map((item) => item.id)).toEqual([starbase.id])
  })

  it('treats two payload customers as rideshare and leaves a single customer off the list', () => {
    const shared = makeLaunch({
      name: 'Electron | Shared flight',
      missionName: 'Shared flight',
      missionType: 'Communications',
      customers: [
        { name: 'Planet', abbrev: null, description: null, country: null, siteUrl: null, type: null, companyId: 'planet' },
        { name: 'Spire', abbrev: null, description: null, country: null, siteUrl: null, type: null, companyId: 'spire' },
      ],
    })
    expect(isRideshareLaunch(shared)).toBe(true)
    expect(isRideshareLaunch(makeLaunch())).toBe(false)
  })

  it('finds Starbase and does not call a spacewalk a walk', () => {
    expect(searchAll('starbase', []).some((hit) => hit.href === '/launches?site=starbase')).toBe(true)
    const event = normalizeEvent({
      id: 1570,
      name: 'Starship Orbital Catch Attempt',
      date: '2026-11-14T21:20:10Z',
      type: { name: 'Spacecraft Capture' },
      description: 'SpaceX is attempting to catch Ship 42 after reentry from orbit at Starbase Texas.',
      location: 'Starbase Texas',
      agencies: [{ name: 'SpaceX' }],
      launches: [{ name: 'Starship | Starlink Group 31-2 (Starship Flight 15)' }],
    })
    expect(event?.rocketIds).toContain('starship')
    expect(event?.agencySlugs).toContain('spacex')
    expect(event?.sourceUrl).toBe('https://ll.thespacedevs.com/2.3.0/events/1570/')
    const eva = normalizeEvent({ id: 3, name: 'Station spacewalk', type: { name: 'EVA' }, date: '2026-12-01T12:00:00Z' })
    expect(eva?.kid.toLowerCase()).not.toContain('walk')
  })

  it('turns Launch Library dashes into plain words and pages the board', () => {
    const event = normalizeEvent({
      id: 42,
      name: 'Solar Orbiter',
      type: { name: 'Mission – Docking' },
      description: 'the best – and first – views of the Sun’s poles',
      location: 'Sun – Earth',
    })
    expect(event?.type).toBe('Mission, Docking')
    expect(event?.description).toBe('the best, and first, views of the Sun’s poles')
    expect(event?.location).toBe('Sun, Earth')
    expect(`${event?.name} ${event?.type} ${event?.description} ${event?.location}`).not.toMatch(/[—–]/)
    const shown = boardSlice(Array.from({ length: 45 }, (_, index) => index), 20)
    expect(shown.items).toHaveLength(20)
    expect(shown.start).toBe(20)
    expect(shown.nextStart).toBe(40)
    expect(shown.prevStart).toBe(0)
    expect(boardSlice([1, 2, 3], 0).nextStart).toBeNull()
  })
})
