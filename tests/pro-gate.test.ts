import { describe, expect, it } from 'vitest'
import { PRO_COPY } from '@/lib/pro/copy'
import {
  FREE_LINE,
  accessLevel,
  approvalMail,
  commerceFree,
  feedToken,
  previewSlice,
  readFeedToken,
  readSigned,
  signInMail,
  signValue,
} from '@/lib/pro/access-gate'

describe('pro access gate', () => {
  it('keeps full desks for approved emails and a preview for everyone else', () => {
    expect(accessLevel('approved')).toBe('full')
    expect(accessLevel('pending')).toBe('preview')
    expect(accessLevel('revoked')).toBe('preview')
    expect(accessLevel(null)).toBe('preview')
    expect(previewSlice(['a', 'b', 'c', 'd'], 'preview', 2)).toEqual(['a', 'b'])
    expect(previewSlice(['a', 'b', 'c'], 'full', 2)).toEqual(['a', 'b', 'c'])
  })

  it('signs a session and a calendar token, and rejects a tampered value', () => {
    const secret = 'test-secret'
    const signed = signValue('session-id', secret)
    expect(signed && readSigned(signed, secret)).toBe('session-id')
    expect(readSigned(`${signed}x`, secret)).toBeNull()
    expect(signValue('session-id', '')).toBeNull()
    const token = feedToken('ada@example.com', secret, 2_000_000_000)
    expect(token && readFeedToken(token, secret, 1_900_000_000)).toBe('ada@example.com')
    expect(token && readFeedToken(token, secret, 2_100_000_000)).toBeNull()
  })

  it('says the desk is free during early access and names no price or payment', () => {
    const mail = `${signInMail('https://liftoffclub.app/api/pro/sign-in/confirm?token=abc').text}\n${approvalMail('https://liftoffclub.app/in').text}\n${JSON.stringify(PRO_COPY)}`
    expect(mail).toContain(FREE_LINE)
    expect(commerceFree(mail)).toBe(true)
    expect(signInMail('https://liftoffclub.app/x').text).toContain('family site does not use an account')
  })
})
