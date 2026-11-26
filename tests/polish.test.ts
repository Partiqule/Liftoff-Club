import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { HOME_COPY, placeLine } from '@/lib/home-copy'
import { finderChrome, skyDragMode, skyHeroNote } from '@/lib/sky-point'

function read(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
}

describe('place line', () => {
  it('drops a repeated pad when the town line already starts with that site', () => {
    expect(
      placeLine({
        padName: 'Rocket Lab Launch Complex 1B',
        padLocation: 'Rocket Lab Launch Complex 1, Mahia Peninsula, New Zealand',
      }),
    ).toBe('Rocket Lab Launch Complex 1B, Mahia Peninsula, New Zealand')
    expect(placeLine({ padName: 'SLC-40', padLocation: 'Cape Canaveral, FL, USA' })).toBe('SLC-40, Cape Canaveral, FL, USA')
    expect(placeLine({ padName: 'SLC-40', padLocation: 'SLC-40, Cape Canaveral, FL, USA' })).toBe('SLC-40, Cape Canaveral, FL, USA')
  })
})

describe('sky page messages', () => {
  it('stays quiet until a town is set, then shows one status', () => {
    expect(skyHeroNote({ hasPlace: false, hasLead: false, skyState: 'loading' })).toBeNull()
    expect(skyHeroNote({ hasPlace: true, hasLead: false, skyState: 'loading' })).toBe('settling')
    expect(skyHeroNote({ hasPlace: true, hasLead: false, skyState: 'error' })).toBe('error')
    expect(skyHeroNote({ hasPlace: true, hasLead: true, skyState: 'ready' })).toBeNull()
    expect(skyHeroNote({ hasPlace: true, hasLead: false, skyState: 'ready' })).toBeNull()
  })

  it('asks for a town before it talks about orbits', () => {
    expect(finderChrome({ hydrated: false, hasPlace: false, catalogState: 'error' })).toEqual({
      checking: true,
      showNotice: false,
      askTown: false,
    })
    expect(finderChrome({ hydrated: true, hasPlace: false, catalogState: 'error' })).toEqual({
      checking: false,
      showNotice: false,
      askTown: true,
    })
    expect(finderChrome({ hydrated: true, hasPlace: true, catalogState: 'error' })).toEqual({
      checking: false,
      showNotice: true,
      askTown: false,
    })
    expect(finderChrome({ hydrated: true, hasPlace: true, catalogState: 'loading' })).toEqual({
      checking: true,
      showNotice: false,
      askTown: false,
    })
  })

  it('lets a vertical finger scroll and pans only after zoom', () => {
    expect(skyDragMode({ moved: 4, dx: 12, dy: 0, zoom: 2 })).toBe('undecided')
    expect(skyDragMode({ moved: 20, dx: 4, dy: 18, zoom: 2 })).toBe('scroll')
    expect(skyDragMode({ moved: 20, dx: 18, dy: 4, zoom: 1 })).toBe('scroll')
    expect(skyDragMode({ moved: 20, dx: 18, dy: 4, zoom: 1.4 })).toBe('move')
  })
})

describe('parent phone polish', () => {
  it('gives inline glossary words a 44px hit area without padding', () => {
    const css = read('app/globals.css')
    expect(css).toMatch(/\.term::before[\s\S]*height:\s*44px/)
    expect(css).toMatch(/\.term \{[^}]*padding:\s*0/)
    expect(css).toMatch(/\.top-nav a \{[^}]*min-height:\s*44px/)
    expect(css).toMatch(/\.top-nav a \{[^}]*min-width:\s*44px/)
  })

  it('keeps the simple pages in plain sentences', () => {
    const files = [
      'app/launches/page.tsx',
      'app/glossary/page.tsx',
      'app/brief/page.tsx',
      'app/error.tsx',
      'app/not-found.tsx',
      'components/tonight.tsx',
      'components/home-live.tsx',
      'lib/home-copy.ts',
    ]
    for (const file of files) {
      const source = read(file)
      expect(source.toLowerCase()).not.toContain('walk')
      expect(source).not.toMatch(/[—–]/)
    }
    expect(read('app/launches/page.tsx')).toContain('Launches')
    expect(read('app/launches/page.tsx')).toContain('Next SpaceX')
    expect(read('components/home-live.tsx')).not.toContain('home-links')
    expect(read('components/tonight.tsx')).not.toContain('Ad astra')
    expect(read('components/sky-board.tsx')).toContain('if (!place || skyState === \'error\') return null')
    expect(read('components/sky-finder.tsx')).not.toContain('key={zoom')
    expect(read('app/glossary/page.tsx')).not.toContain('corner')
    expect(read('app/not-found.tsx')).toContain('Back home')
    expect(read('app/error.tsx')).toContain('This page did not load.')
    expect(HOME_COPY.emptyLede).toBe('No upcoming flight is posted right now.')
    for (const text of Object.values(HOME_COPY)) expect(text).not.toMatch(/[—–-]/)
  })
})
