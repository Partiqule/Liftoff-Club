import { describe, expect, it } from 'vitest'
import { cronAuthorized, pushConfigured, readPushEnv } from '@/lib/push/config'
import { applyNotices, planNotices, type PushRecord } from '@/lib/push/plan'
import { parseSubscribe } from '@/lib/push/record'

const base: PushRecord = {
  launchIds: ['flight'],
  nets: { flight: '2026-11-16T20:00:00Z' },
  sent: {},
  quietStart: '21:00',
  quietEnd: '07:00',
  timezone: 'America/Denver',
  paused: false,
}

const launch = {
  id: 'flight',
  name: 'Falcon 9 | Test',
  net: '2026-11-16T20:00:00Z',
  precision: 'Second',
  statusName: 'Go',
}

describe('phone alert plan', () => {
  it('sends the hour alert inside the hour before liftoff, in Mountain Time', () => {
    const notices = planNotices(Date.parse('2026-11-16T19:10:00Z'), base, [launch])
    expect(notices.map((item) => item.kind)).toEqual(['hour'])
    expect(notices[0]?.body).toContain('1:00 PM MT')
  })

  it('sends liftoff on the check nearest the clock', () => {
    const notices = planNotices(Date.parse('2026-11-16T20:02:00Z'), base, [launch])
    expect(notices.map((item) => item.kind)).toEqual(['liftoff'])
  })

  it('sends a moved clock once, then remembers it', () => {
    const moved = { ...launch, net: '2026-11-16T22:00:00Z' }
    const notices = planNotices(Date.parse('2026-11-16T18:00:00Z'), base, [moved])
    expect(notices.map((item) => item.kind)).toContain('moved')
    const next = applyNotices(base, notices, [moved])
    expect(planNotices(Date.parse('2026-11-16T18:05:00Z'), next, [moved]).some((item) => item.kind === 'moved')).toBe(false)
  })

  it('stays quiet for kids mode and for bedtime', () => {
    expect(planNotices(Date.parse('2026-11-16T19:10:00Z'), { ...base, paused: true }, [launch])).toEqual([])
    expect(planNotices(Date.parse('2026-11-17T05:00:00Z'), base, [{ ...launch, net: '2026-11-17T05:30:00Z' }])).toEqual([])
  })

  it('does not invent a liftoff time when the clock is not set', () => {
    const notices = planNotices(Date.parse('2026-11-16T19:10:00Z'), { ...base, nets: {} }, [
      { ...launch, net: '2026-11-30T00:00:00Z', precision: 'Month', statusName: 'To Be Determined' },
    ])
    expect(notices).toEqual([])
  })
})

describe('phone alert setup', () => {
  it('hides the feature until the keys and the store are present', () => {
    expect(pushConfigured({})).toBe(false)
    expect(readPushEnv({})).toBeNull()
    const env = {
      VAPID_PUBLIC_KEY: 'public',
      VAPID_PRIVATE_KEY: 'private',
      VAPID_SUBJECT: 'mailto:alerts@liftoffclub.app',
      UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'token',
    }
    expect(pushConfigured(env)).toBe(true)
    expect(readPushEnv({ ...env, VAPID_SUBJECT: 'not-a-url' })).toBeNull()
    expect(readPushEnv({ ...env, UPSTASH_REDIS_REST_URL: '', KV_REST_API_URL: 'https://kv.example', KV_REST_API_TOKEN: 'kv' })).not.toBeNull()
  })

  it('rejects a cron call without the secret', () => {
    expect(cronAuthorized(null, {})).toBe(false)
    expect(cronAuthorized('Bearer nope', { CRON_SECRET: 'secret' })).toBe(false)
    expect(cronAuthorized('Bearer secret', { CRON_SECRET: 'secret' })).toBe(true)
  })

  it('stores a paused subscription while kids mode is on', () => {
    const parsed = parseSubscribe(
      {
        subscription: { endpoint: 'https://push.example/1', keys: { p256dh: 'key', auth: 'auth' } },
        launchIds: ['flight'],
        kidsMode: true,
      },
      true,
    )
    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(parsed.value.paused).toBe(true)
  })
})
