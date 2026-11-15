import { describe, expect, it } from 'vitest'
import { feedToIcs, foldLine, googleCalendarUrl, launchToIcs, toUtcStamp } from '@/lib/calendar'
import { makeLaunch } from './fixtures'

describe('calendar', () => {
  it('keeps a stable uid and bumps sequence when the record updates', () => {
    const launch = makeLaunch()
    const slipped = makeLaunch({ net: '2026-11-19T05:00:00Z', lastUpdated: '2026-11-18T01:00:00Z' })
    const first = launchToIcs(launch, 'https://liftoff.example')
    const second = launchToIcs(slipped, 'https://liftoff.example')
    expect(first).toContain('UID:launch-launch-1@liftoff.club')
    expect(second).toContain('UID:launch-launch-1@liftoff.club')
    expect(first).toContain('DTSTART:20261118T031400Z')
    expect(second).toContain('DTSTART:20261119T050000Z')
    const seq = (text: string) => Number(text.match(/SEQUENCE:(\d+)/)?.[1])
    expect(seq(second)).toBeGreaterThan(seq(first))
  })

  it('escapes commas and folds long lines', () => {
    const launch = makeLaunch({
      missionDescription: 'A very long note, with commas; and a line that keeps going so the calendar file must fold it under the 75 octet rule. '.repeat(4),
    })
    const ics = launchToIcs(launch, 'https://liftoff.example')
    expect(ics).toContain('\\,')
    const long = ics.split('\r\n').find((line) => line.startsWith('DESCRIPTION:'))
    expect(long).toBeTruthy()
    expect(Buffer.byteLength(long ?? '', 'utf8')).toBeLessThanOrEqual(75)
    expect(ics).toContain('\r\n ')
  })

  it('uses an all-day event when the clock is only a day', () => {
    const ics = launchToIcs(makeLaunch({ precision: 'Day' }), 'https://liftoff.example', { alarm: false })
    expect(ics).toContain('DTSTART;VALUE=DATE:20261118')
    expect(ics).toContain('DTEND;VALUE=DATE:20261119')
    expect(ics).not.toContain('BEGIN:VALARM')
  })

  it('builds a feed of future launches with a refresh hint', () => {
    const feed = feedToIcs(
      [makeLaunch(), makeLaunch({ id: 'old', net: '2020-01-01T00:00:00Z' })],
      'https://liftoff.example',
      Date.parse('2026-11-14T00:00:00Z'),
    )
    expect(feed).toContain('UID:launch-launch-1@liftoff.club')
    expect(feed).not.toContain('UID:launch-old@liftoff.club')
    expect(feed).toContain('REFRESH-INTERVAL;VALUE=DURATION:PT1H')
    expect(feed.endsWith('\r\n')).toBe(true)
  })

  it('folds on octet boundaries', () => {
    const folded = foldLine(`SUMMARY:${'é'.repeat(40)}`)
    const lines = folded.split('\r\n')
    expect(lines.length).toBeGreaterThan(1)
    for (const line of lines) expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75)
  })

  it('stamps google dates in utc', () => {
    const url = googleCalendarUrl(makeLaunch(), 'https://liftoff.example')
    expect(url).toContain(toUtcStamp(new Date('2026-11-18T03:14:00Z')))
    expect(url).toContain('Liftoff')
  })
})
