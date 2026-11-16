import { describe, expect, it } from 'vitest'
import { dueAlerts } from '@/lib/alerts'
import { explainLaunch, templateExplain } from '@/lib/explain'
import { normalizeLaunch } from '@/lib/normalize'
import { isQuietHour } from '@/lib/quiet'
import { isStillAhead, pickNext } from '@/lib/schedule'
import { stageScript } from '@/lib/stages'
import { defaultSettings } from '@/lib/settings'
import { seeLaunch } from '@/lib/visibility'
import { judgeSky } from '@/lib/weather'
import { makeLaunch } from './fixtures'
import { toBrief } from '@/lib/schedule'

describe('explainers', () => {
  it('tells a child that Starlink is about internet', async () => {
    const story = templateExplain(makeLaunch())
    expect(story.kid.toLowerCase()).toContain('internet')
    expect(story.kid.toLowerCase()).not.toContain('mega-constellation')
    const resolved = await explainLaunch(makeLaunch())
    expect(resolved.source).toBe('template')
  })

  it('does not invent a classified cargo', () => {
    const story = templateExplain(
      makeLaunch({
        name: 'Falcon 9 | USSF-317',
        missionName: 'USSF-317',
        missionType: 'Government/Top Secret',
        missionDescription: 'A classified mission for the United States Space Force.',
        featured: true,
      }),
    )
    expect(story.kid.toLowerCase()).toMatch(/not said|do not get to know/)
  })
})

describe('manifest and normalize', () => {
  it('names Starlink and the provider from a launch library shaped object', () => {
    const launch = normalizeLaunch({
      id: 'abc',
      name: 'Falcon 9 Block 5 | Starlink Group 15-21',
      launch_service_provider: { name: 'SpaceX', abbrev: 'SpX', type: { name: 'Commercial' } },
      rocket: { configuration: { name: 'Falcon 9' }, payloads: [] },
      mission: {
        name: 'Starlink Group 15-21',
        type: 'Communications',
        description: 'A batch of 27 satellites for the Starlink mega-constellation.',
        orbit: { name: 'Low Earth Orbit', abbrev: 'LEO' },
        agencies: [{ name: 'SpaceX' }],
      },
      pad: { name: 'SLC-4E', latitude: 34.6, longitude: -120.6, location: { name: 'Vandenberg' } },
      net: '2026-11-18T03:14:00Z',
      status: { name: 'Go for Launch', abbrev: 'Go' },
      timeline: [{ type: { abbrev: 'Liftoff', description: 'Up' }, relative_time: 'P0D' }],
    })
    expect(launch?.featured).toBe(true)
    expect(launch?.manifest.some((item) => /starlink/i.test(item.name) && item.count === 27)).toBe(true)
    expect(launch?.manifest.some((item) => item.companyId === 'spacex' && item.companySlug === 'spacex' && item.careersUrl?.includes('spacex.com'))).toBe(true)
    expect(launch?.manifest.find((item) => /starlink/i.test(item.name))?.companyId).toBe('spacex')
    expect(launch?.timeline[0]?.offsetSec).toBe(0)
  })
})

describe('can we see it', () => {
  const centennial = { lat: 39.58, lon: -104.88, label: 'Centennial' }
  const cocoa = { lat: 28.4, lon: -80.6, label: 'Cocoa Beach' }

  it('says a Florida neighbor can see a night launch and Colorado cannot', () => {
    const launch = makeLaunch({ net: '2026-11-18T03:14:00Z' })
    const near = seeLaunch(launch, cocoa)
    const far = seeLaunch(launch, centennial)
    expect(near.grade === 'likely' || near.grade === 'maybe').toBe(true)
    expect(far.grade).toBe('too-far')
    expect(far.summary).toMatch(/Centennial/)
  })

  it('asks for a town before guessing', () => {
    expect(seeLaunch(makeLaunch(), null).grade).toBe('unknown')
  })
})

describe('weather and bedtime', () => {
  it('calls a clear hour a go and a storm a no-go', () => {
    expect(judgeSky({ cloud: 10, precip: 0, code: 0 }).call).toBe('go')
    expect(judgeSky({ cloud: 50, precip: 20, code: 2 }).call).toBe('maybe')
    expect(judgeSky({ cloud: 20, precip: 10, code: 63 }).call).toBe('nogo')
    expect(judgeSky({ cloud: 90, precip: 0, code: 3 }).call).toBe('nogo')
  })

  it('wraps quiet hours across midnight', () => {
    const zone = 'UTC'
    expect(isQuietHour(new Date('2026-11-15T22:30:00Z'), '21:00', '07:00', zone)).toBe(true)
    expect(isQuietHour(new Date('2026-11-15T06:00:00Z'), '21:00', '07:00', zone)).toBe(true)
    expect(isQuietHour(new Date('2026-11-15T12:00:00Z'), '21:00', '07:00', zone)).toBe(false)
  })
})

describe('alerts', () => {
  it('stays quiet at bedtime and can filter to SpaceX you might see', () => {
    const launch = makeLaunch()
    const briefs = [toBrief(launch)]
    const duringBed = dueAlerts({
      now: Date.parse('2026-11-18T02:30:00Z'),
      settings: {
        ...defaultSettings,
        quietStart: '21:00',
        quietEnd: '07:00',
        location: { label: 'UTC', lat: 0, lon: 0, timezone: 'UTC', source: 'search' },
        notifications: { ...defaultSettings.notifications, enabled: true, leadMinutes: 60 },
      },
      briefs,
      passes: [],
      already: new Set(),
    })
    expect(duringBed).toHaveLength(0)

    const visible = dueAlerts({
      now: Date.parse('2026-11-18T02:30:00Z'),
      settings: {
        ...defaultSettings,
        quietStart: '08:00',
        quietEnd: '09:00',
        location: { label: 'Cocoa', lat: 28.4, lon: -80.6, timezone: 'UTC', source: 'search' },
        notifications: { ...defaultSettings.notifications, enabled: true, leadMinutes: 60, providerMode: 'spacex', visibleOnly: true },
      },
      briefs,
      passes: [],
      already: new Set(),
    })
    expect(visible).toHaveLength(1)
    expect(visible[0].url).toContain('/day')
  })
})

describe('launch day lines', () => {
  it('says liftoff at T-0 and uses the public timeline', () => {
    const at = stageScript(makeLaunch(), Date.parse('2026-11-18T03:14:30Z'))
    expect(at.kid.toLowerCase()).toContain('liftoff')
    expect(at.steps.find((step) => step.state === 'now')?.abbrev).toBe('Liftoff')
    const early = stageScript(makeLaunch({ timeline: [] }), Date.parse('2026-11-17T12:00:00Z'))
    expect(early.kid.toLowerCase()).toMatch(/pad|nothing loud/)
  })

  it('drops launches that already succeeded', () => {
    expect(isStillAhead(makeLaunch({ statusAbbrev: 'Success', statusName: 'Launch Successful' }))).toBe(false)
    expect(isStillAhead(makeLaunch(), Date.parse('2026-11-18T03:00:00Z'))).toBe(true)
  })

  it('does not pick a past Starship history row as the next launch', () => {
    const now = Date.parse('2026-11-15T12:00:00Z')
    const past = makeLaunch({
      id: 'flight-8',
      name: 'Starship | Flight 8',
      net: '2025-03-06T23:30:00Z',
      windowEnd: '2025-03-06T23:30:00Z',
      statusName: 'In Flight',
      statusAbbrev: 'Flight',
      featured: true,
      historical: true,
    })
    const future = makeLaunch({
      id: 'soon',
      name: 'Falcon 9 | Starlink',
      net: '2026-11-20T00:00:00Z',
      windowEnd: '2026-11-20T01:00:00Z',
      featured: true,
      historical: false,
    })
    expect(isStillAhead(past, now)).toBe(false)
    expect(isStillAhead({ ...past, historical: false }, now)).toBe(false)
    expect(pickNext([past, future], now)?.id).toBe('soon')
    expect(pickNext([past], now)).toBeNull()
    expect(pickNext([{ ...past, historical: false, net: '2026-12-01T00:00:00Z', windowEnd: '2026-12-01T00:00:00Z' }], now)?.name).toContain('Starship')
  })
})
