import { describe, expect, it } from 'vitest'
import { dueAlerts } from '@/lib/alerts'
import { answerFromLaunch, askAboutLaunch, questionKey } from '@/lib/ask'
import { buildBrief } from '@/lib/brief'
import { flightsForFollows, toggleFollow } from '@/lib/follows'
import { defaultSettings } from '@/lib/settings'
import { toBrief } from '@/lib/schedule'
import type { WeatherBundle } from '@/lib/weather'
import { makeLaunch } from './fixtures'

describe('launch answers stay inside the listing', () => {
  it('quotes booster history and refuses a question the record cannot answer', () => {
    const launch = makeLaunch()
    const booster = answerFromLaunch(launch, 'Which booster is flying, and where does it land?')
    expect(booster).toContain('B1080')
    expect(booster).toContain('7 successful landings')
    expect(booster).toContain('A Shortfall of Gravitas')
    expect(answerFromLaunch(launch, 'Is the rocket painted blue?')).toBe(
      'The public listing does not answer that. This page will not guess.',
    )
  })

  it('uses the listing when no model key is set, and caches that reply', async () => {
    const previous = process.env.EXPLAINER_API_KEY
    delete process.env.EXPLAINER_API_KEY
    const launch = makeLaunch({ id: 'ask-cache' })
    const first = await askAboutLaunch(launch, 'When is liftoff?')
    const second = await askAboutLaunch(launch, '  when   is liftoff ')
    expect(first.source).toBe('listing')
    expect(second.answer).toBe(first.answer)
    expect(questionKey(launch.id, 'When is liftoff?')).toBe(questionKey(launch.id, '  when   is liftoff '))
    if (previous) process.env.EXPLAINER_API_KEY = previous
  })
})

describe('saved alert rules', () => {
  const place = { label: 'Cocoa', lat: 28.4, lon: -80.6, timezone: 'UTC', source: 'search' as const }
  const base = {
    ...defaultSettings,
    quietStart: '08:00',
    quietEnd: '09:00',
    location: place,
  }

  it('keeps only Starship when that rule is on', () => {
    const briefs = [
      toBrief(makeLaunch()),
      toBrief(makeLaunch({ id: 'ship', name: 'Starship Flight 12', rocketName: 'Starship' })),
    ]
    const due = dueAlerts({
      now: Date.parse('2026-11-18T01:00:00Z'),
      settings: {
        ...base,
        notifications: { ...defaultSettings.notifications, enabled: true, leadMinutes: 180, rules: { starship: true, visibleFromHere: false, hourWithWeather: false } },
      },
      briefs,
      passes: [],
      already: new Set(),
    })
    expect(due.map((item) => item.id)).toEqual(['launch:ship'])
    expect(due[0].body).toContain('Starship')
  })

  it('adds the sky call inside the last hour', () => {
    const weather: WeatherBundle = {
      timezone: 'UTC',
      fetchedAt: '2026-11-18T02:00:00Z',
      hours: [{ time: '2026-11-18T03:00', cloud: 10, precip: 0, code: 0 }],
    }
    const due = dueAlerts({
      now: Date.parse('2026-11-18T02:30:00Z'),
      settings: {
        ...base,
        notifications: {
          ...defaultSettings.notifications,
          enabled: true,
          leadMinutes: 60,
          rules: { starship: false, visibleFromHere: false, hourWithWeather: true },
        },
      },
      briefs: [toBrief(makeLaunch())],
      passes: [],
      already: new Set(),
      weather,
    })
    expect(due).toHaveLength(1)
    expect(due[0].body).toContain("it's a go")
  })

  it('drops a launch we cannot see when the visibility rule is the only one on', () => {
    const due = dueAlerts({
      now: Date.parse('2026-11-18T02:30:00Z'),
      settings: {
        ...base,
        location: { label: 'Tokyo', lat: 35.68, lon: 139.69, timezone: 'UTC', source: 'search' },
        notifications: {
          ...defaultSettings.notifications,
          enabled: true,
          leadMinutes: 60,
          rules: { starship: false, visibleFromHere: true, hourWithWeather: false },
        },
      },
      briefs: [toBrief(makeLaunch())],
      passes: [],
      already: new Set(),
    })
    expect(due).toHaveLength(0)
  })
})

describe('the brief', () => {
  const source = {
    id: 'launch-1',
    name: 'Falcon 9 Block 5 | Starlink Group 10-1',
    net: '2026-11-18T03:14:00Z',
    providerName: 'SpaceX',
    rocketName: 'Falcon 9',
    padName: 'SLC-40',
    padLocation: 'Cape Canaveral',
  }

  it('keeps today short and the week longer', () => {
    const today = buildBrief({
      period: 'day',
      now: Date.parse('2026-11-18T00:00:00Z'),
      launches: [source, { ...source, id: 'later', name: 'Later', net: '2026-11-20T00:00:00Z' }],
      passes: [],
      placeLabel: 'Centennial',
    })
    expect(today.launches.map((item) => item.id)).toEqual(['launch-1'])
    expect(today.text).toContain('daily brief')
    expect(today.sky).toContain('Centennial')
    const week = buildBrief({
      period: 'week',
      now: Date.parse('2026-11-18T00:00:00Z'),
      launches: [source, { ...source, id: 'later', name: 'Later', net: '2026-11-20T00:00:00Z' }],
      passes: [],
      placeLabel: null,
    })
    expect(week.launches).toHaveLength(2)
  })
})

describe('follows', () => {
  it('toggles a company and lists what they are flying', () => {
    expect(toggleFollow([], 'spacex')).toEqual(['spacex'])
    expect(toggleFollow(['spacex'], 'spacex')).toEqual([])
    const rows = flightsForFollows(['spacex'], [makeLaunch()])
    expect(rows.some((row) => row.slug === 'spacex' && row.launchId === 'launch-1')).toBe(true)
    expect(flightsForFollows(['ula'], [makeLaunch()])).toHaveLength(0)
  })
})
