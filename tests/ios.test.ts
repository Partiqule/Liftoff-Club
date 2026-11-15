import { generateKeyPairSync } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { apnsJwt, apnsPayload, deviceToken, parseApnsRegister, readApnsEnv, shareLaunchText, verifyEs256 } from '@/lib/ios/apns'
import { iosSchedule, readStoredSchedule } from '@/lib/ios/schedule'
import { makeLaunch } from './fixtures'

describe('iPhone schedule', () => {
  it('keeps the next flights and does not invent a clock', () => {
    const now = new Date('2026-11-15T00:00:00Z')
    const future = makeLaunch({ id: 'soon', net: '2026-11-20T18:00:00Z' })
    const flown = makeLaunch({ id: 'done', net: '2026-11-01T18:00:00Z', statusName: 'Launch Successful', statusAbbrev: 'Success' })
    const open = makeLaunch({ id: 'open', name: 'Starship | Flight', net: null, windowEnd: null })
    const schedule = iosSchedule([flown, open, future], 'https://liftoffclub.app', now)
    expect(schedule.launches.map((item) => item.id)).toEqual(['soon', 'open'])
    expect(schedule.launches[0]?.url).toBe('https://liftoffclub.app/launches/soon')
    expect(schedule.launches[1]?.net).toBeNull()
    expect(schedule.launches[1]?.whenLabel).toBe('Clock not set')
    expect(JSON.stringify(schedule).toLowerCase()).not.toContain('walk')
    const stored = readStoredSchedule(JSON.stringify(schedule))
    expect(stored?.launches).toHaveLength(2)
    expect(readStoredSchedule('nope')).toBeNull()
  })
})

describe('iPhone push and share', () => {
  it('rejects a missing key and a bad device token', () => {
    expect(readApnsEnv({})).toBeNull()
    expect(deviceToken('not-a-token')).toBeNull()
    expect(deviceToken('zz')).toBeNull()
    const parsed = parseApnsRegister({ token: 'abc', launchIds: ['flight'] }, false)
    expect(parsed.ok).toBe(false)
  })

  it('signs a token the public key accepts, and keeps kids mode paused', () => {
    const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
    const config = readApnsEnv({
      APNS_KEY_ID: 'ABCDE12345',
      APNS_PRIVATE_KEY: pem,
      APNS_TEAM_ID: '39AMCG49RK',
      APNS_ENV: 'sandbox',
    })
    expect(config?.host).toBe('https://api.sandbox.push.apple.com')
    expect(config?.bundleId).toBe('app.liftoffclub')
    const jwt = config ? apnsJwt(config, Date.parse('2026-11-15T20:00:00Z')) : ''
    const [header, body, signature] = jwt.split('.')
    expect(JSON.parse(Buffer.from(header, 'base64url').toString()).kid).toBe('ABCDE12345')
    expect(verifyEs256(publicKey, `${header}.${body}`, signature)).toBe(true)
    const token = 'ab'.repeat(32)
    const device = parseApnsRegister({ token, launchIds: ['flight'], kidsMode: true }, false)
    expect(device.ok && device.value.paused).toBe(true)
    expect(device.ok && device.value.token).toBe(token)
    const payload = apnsPayload({ title: 'One hour', body: 'About an hour to go.', url: '/launches/flight/day' })
    expect(payload).toContain('One hour')
    expect(payload).not.toMatch(/[—–]/)
    expect(shareLaunchText('Falcon 9', 'Nov 18, 8:14 PM MST')).toBe('Falcon 9. Nov 18, 8:14 PM MST.')
    expect(shareLaunchText('Falcon 9', 'Nov 18, 8:14 PM MST').toLowerCase()).not.toContain('walk')
  })
})
