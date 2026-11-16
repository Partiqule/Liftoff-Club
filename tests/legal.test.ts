import { describe, expect, it } from 'vitest'
import { catalogGroupAllowed, celestrakShouldHalt, starlinkLaunchUrl } from '@/lib/celestrak-query'
import { PRIVACY, SUPPORT } from '@/lib/legal'
import { parseCatalogCsv } from '@/lib/constellation-tally'
import { PRO_COPY } from '@/lib/pro/copy'

describe('legal copy', () => {
  it('covers kids, deletion, and the processors without a dash or the word walk', () => {
    const text = `${JSON.stringify(PRIVACY)} ${JSON.stringify(SUPPORT)} ${JSON.stringify(PRO_COPY)}`
    expect(text).toContain('collects no personal data from kids')
    expect(text).toContain('privacy@liftoffclub.app')
    expect(text).toContain('Upstash')
    expect(text).toContain('Resend')
    expect(text).toContain('Vercel')
    expect(text).toContain('Free during early access')
    expect(text.toLowerCase()).not.toContain('walk')
    expect(text.toLowerCase()).not.toContain('pricing')
    expect(text).not.toMatch(/[—–]/)
  })
})

describe('celestrak limits', () => {
  it('counts the starlink catalog, prefers one launch for passes, and stops on a 403', () => {
    expect(catalogGroupAllowed('starlink')).toBe(true)
    expect(catalogGroupAllowed('oneweb')).toBe(true)
    expect(catalogGroupAllowed('  ')).toBe(false)
    expect(starlinkLaunchUrl('2026-256')).toContain('INTDES=2026-256')
    expect(starlinkLaunchUrl('2026-256')).toContain('FORMAT=JSON')
    expect(starlinkLaunchUrl('nope')).toBeNull()
    expect(celestrakShouldHalt(403)).toBe(true)
    expect(celestrakShouldHalt(500)).toBe(true)
    expect(celestrakShouldHalt(200)).toBe(false)
    expect(celestrakShouldHalt(404)).toBe(false)
    const rows = parseCatalogCsv('OBJECT_TYPE,OBJECT_ID,LAUNCH_DATE,DECAY_DATE\nPAY,2024-001A,2024-01-02,\n')
    expect(rows[0]?.objectType).toBe('PAY')
    expect(rows[0]?.decayDate).toBeNull()
  })
})
