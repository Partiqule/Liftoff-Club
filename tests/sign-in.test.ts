import { describe, expect, it } from 'vitest'
import { EXPIRED_COPY, WELCOME_COPY, commerceFree, deskChrome, forwardMagicLink, signInResult } from '@/lib/pro/access-gate'
import { magicConfirmUrl } from '@/lib/site'

describe('magic link callback', () => {
  it('lands a successful callback on /pro with a session cookie', () => {
    expect(signInResult({ email: 'ada@example.com', saved: true, signed: 'session.sig' })).toEqual({
      path: '/pro?in=1',
      cookie: true,
    })
  })

  it('sends an expired, used, or invalid token to an explanation and sets no cookie', () => {
    expect(signInResult({ email: null, saved: false, signed: null })).toEqual({ path: '/pro?in=expired', cookie: false })
    expect(signInResult({ email: 'ada@example.com', saved: false, signed: 'session.sig' }).cookie).toBe(false)
    expect(signInResult({ email: 'ada@example.com', saved: true, signed: null }).cookie).toBe(false)
  })

  it('points the email at liftoffclub.app, and forwards a preview click there before the token is used', () => {
    const preview = magicConfirmUrl('abc', {
      VERCEL_ENV: 'preview',
      VERCEL_URL: 'liftoff-club-git-preview.vercel.app',
      NEXT_PUBLIC_SITE_URL: 'https://liftoff-club-git-preview.vercel.app',
    })
    expect(preview).toBe('https://liftoffclub.app/api/pro/sign-in/confirm?token=abc')
    expect(magicConfirmUrl('abc', { VERCEL_ENV: 'production' })).toBe('https://liftoffclub.app/api/pro/sign-in/confirm?token=abc')
    expect(magicConfirmUrl('abc', {})).toBe('http://localhost:3000/api/pro/sign-in/confirm?token=abc')
    expect(forwardMagicLink('https://liftoff-club-git-preview.vercel.app/api/pro/sign-in/confirm?token=abc')).toBe(
      'https://liftoffclub.app/api/pro/sign-in/confirm?token=abc',
    )
    expect(forwardMagicLink('https://liftoffclub.app/api/pro/sign-in/confirm?token=abc')).toBeNull()
    expect(forwardMagicLink('http://localhost:3000/api/pro/sign-in/confirm?token=abc')).toBeNull()
  })
})

describe('signed in desk', () => {
  it('hides the request form and shows sign out after a real session', () => {
    expect(deskChrome('full')).toEqual({ requestAccess: false, signOut: true })
    expect(deskChrome('preview')).toEqual({ requestAccess: true, signOut: false })
    const copy = `${WELCOME_COPY.title} ${WELCOME_COPY.body} ${WELCOME_COPY.close} ${EXPIRED_COPY.title} ${EXPIRED_COPY.body} ${EXPIRED_COPY.button}`
    expect(copy).toContain("You're in")
    expect(copy).toContain('Email a fresh link')
    expect(copy.toLowerCase()).not.toContain('walk')
    expect(copy).not.toMatch(/[—–]/)
    expect(commerceFree(copy)).toBe(true)
  })
})
