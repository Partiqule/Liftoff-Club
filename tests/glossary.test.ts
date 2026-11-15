import { describe, expect, it } from 'vitest'
import { GLOSSARY, getTerm, splitGlossary } from '@/lib/glossary'
import { readWordIds, rememberWord } from '@/lib/words'

describe('glossary definitions', () => {
  it('gives every term a distinct id and two different one line definitions', () => {
    const ids = GLOSSARY.map((term) => term.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const term of GLOSSARY) {
      expect(term.adult.endsWith('.')).toBe(true)
      expect(term.kid.endsWith('.')).toBe(true)
      expect(term.adult).not.toBe(term.kid)
      expect(term.adult.includes('\n') || term.kid.includes('\n')).toBe(false)
      expect(`${term.adult} ${term.kid}`).not.toMatch(/[—–]|--/)
      for (const pattern of term.patterns) expect(() => new RegExp(pattern.source)).not.toThrow()
    }
  })
})

describe('finding terms in launch copy', () => {
  it('marks Max Q, MECO, and a droneship without eating nearby words', () => {
    const segments = splitGlossary('After Max-Q comes MECO, then the booster lands on a droneship. A leonid is not LEO.')
    const terms = segments.filter((segment) => segment.type === 'term')
    expect(terms.map((segment) => segment.id)).toEqual(['max-q', 'meco', 'droneship', 'leo'])
    expect(segments.some((segment) => segment.type === 'text' && segment.value.includes('leonid'))).toBe(true)
  })

  it('prefers the longer phrase when two terms share a start', () => {
    expect(splitGlossary('Fairing separation comes after stage separation.').filter((segment) => segment.type === 'term').map((segment) => segment.id)).toEqual([
      'fairing-separation',
      'stage-separation',
    ])
    expect(splitGlossary('Geostationary transfer orbit, then a geostationary orbit.').filter((segment) => segment.type === 'term').map((segment) => segment.id)).toEqual([
      'gto',
      'geo',
    ])
    expect(splitGlossary('Low Earth orbit').filter((segment) => segment.type === 'term')[0]).toMatchObject({ id: 'leo', value: 'Low Earth orbit' })
  })

  it('catches countdown shorthand and a scrub, and leaves a lowercase net alone', () => {
    const clock = splitGlossary('T-10 and T minus 1 are still before T0. Scrubbed for weather.')
    expect(clock.filter((segment) => segment.type === 'term').map((segment) => segment.id)).toEqual(['t-minus', 't-minus', 't-minus', 'scrub'])
    expect(splitGlossary('the net time is tomorrow').every((segment) => segment.type === 'text')).toBe(true)
    expect(splitGlossary('No earlier than Friday')[0]).toMatchObject({ type: 'term', id: 'net' })
  })

  it('does not treat ordinary words as engine calls', () => {
    const plain = splitGlossary('The secondary camera watched a mechanic hold the household ladder.')
    expect(plain).toEqual([{ type: 'text', value: 'The secondary camera watched a mechanic hold the household ladder.' }])
  })
})

describe('my space words', () => {
  it('keeps the latest opened term first and drops unknown ids', () => {
    expect(rememberWord([], 'meco')).toEqual(['meco'])
    expect(rememberWord(['meco', 'leo'], 'max-q')).toEqual(['max-q', 'meco', 'leo'])
    expect(rememberWord(['meco', 'leo'], 'leo')).toEqual(['leo', 'meco'])
    expect(rememberWord(['meco'], 'not-a-term')).toEqual(['meco'])
    expect(getTerm('rtls')?.expands).toBe('Return to launch site')
    expect(readWordIds(JSON.stringify(['leo', 'nope', 'leo', 'meco']))).toEqual(['leo', 'meco'])
  })
})
