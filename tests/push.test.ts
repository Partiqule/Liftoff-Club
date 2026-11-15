import { generateKeyPairSync, sign, type KeyObject } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { cronAuthorized, pushConfigured, readPushEnv } from '@/lib/push/config'
import { GITHUB_OIDC_AUD, GITHUB_OIDC_ISS, GITHUB_OIDC_REF, GITHUB_OIDC_REPO, alertCallerAllowed, oidcClaimsAllow, verifyOidcSignature } from '@/lib/push/github-oidc'
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
  it('sends the hour alert inside the window, in Mountain Time, and only once', () => {
    const at = Date.parse('2026-11-16T19:10:00Z')
    const notices = planNotices(at, base, [launch])
    expect(notices.map((item) => item.kind)).toEqual(['hour'])
    expect(notices[0]?.body).toMatch(/1:00 PM M[DS]T/)
    const again = applyNotices(base, notices, [launch])
    expect(planNotices(at + 5 * 60 * 1000, again, [launch]).some((item) => item.kind === 'hour')).toBe(false)
    expect(planNotices(Date.parse('2026-11-16T19:50:00Z'), base, [launch]).some((item) => item.kind === 'hour')).toBe(false)
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

  it('puts a published scrub reason in the phone note, and says when none was published', () => {
    const scrubbed = {
      ...launch,
      statusName: 'Scrubbed',
      failReason: 'High winds.',
    }
    const withHistory = { ...base, statuses: { flight: 'Go' } }
    const noted = planNotices(Date.parse('2026-11-16T18:00:00Z'), withHistory, [scrubbed])
    expect(noted[0]?.body).toContain('Status is now Scrubbed.')
    expect(noted[0]?.body).toContain('Reason: High winds.')
    const quiet = planNotices(Date.parse('2026-11-16T18:00:00Z'), withHistory, [{ ...scrubbed, failReason: null }])
    expect(quiet[0]?.body).toContain('No reason was published.')
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

  it('accepts a GitHub Actions token for this repo on main and rejects the others', async () => {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
    const jwk = publicKey.export({ format: 'jwk' })
    const now = Date.parse('2026-11-15T20:00:00Z')
    const claims = {
      iss: GITHUB_OIDC_ISS,
      aud: GITHUB_OIDC_AUD,
      repository: GITHUB_OIDC_REPO,
      ref: GITHUB_OIDC_REF,
      exp: Math.floor(now / 1000) + 600,
    }
    const token = signed(claims, privateKey)
    expect(verifyOidcSignature(token, jwk)).toBe(true)
    expect(oidcClaimsAllow(claims, now)).toBe(true)
    expect(oidcClaimsAllow({ ...claims, ref: 'refs/heads/other' }, now)).toBe(false)
    expect(oidcClaimsAllow({ ...claims, repository: 'other/Liftoff-Club' }, now)).toBe(false)
    expect(oidcClaimsAllow({ ...claims, aud: 'https://example.com' }, now)).toBe(false)
    expect(oidcClaimsAllow({ ...claims, exp: Math.floor(now / 1000) - 10 }, now)).toBe(false)
    expect(verifyOidcSignature(`${token}x`, jwk)).toBe(false)
    await expect(alertCallerAllowed('Bearer not-a-token', false, now)).resolves.toBe(false)
    await expect(alertCallerAllowed(null, false, now)).resolves.toBe(false)
    await expect(alertCallerAllowed('Bearer secret', true, now)).resolves.toBe(true)
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

function signed(payload: Record<string, unknown>, privateKey: KeyObject): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'test' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = sign('RSA-SHA256', Buffer.from(`${header}.${body}`), privateKey).toString('base64url')
  return `${header}.${body}.${signature}`
}
