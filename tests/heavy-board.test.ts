import { describe, expect, it } from 'vitest'
import { isStarshipOrHeavy, manifestBoard, missingHeavy } from '@/lib/heavy-board'
import { filterManifest } from '@/lib/pro/manifest-intel'
import { filterLaunches } from '@/lib/schedule'
import { makeLaunch } from './fixtures'

/**
 * Live Launch Library upcoming list read on 2026-11-15.
 * Falcon Heavy had 12 upcoming flights. Starship had 3. Do not drop any of these ids.
 */
const LIVE = [
  ['c1bd775a-2fff-45bb-9726-765b69817c19', 'Falcon Heavy | USSF-75', 'Falcon Heavy'],
  ['d3bd7fb2-fac6-49fc-ae52-cee07d2fde67', 'Falcon Heavy | Griffin Mission One', 'Falcon Heavy'],
  ['11e5e716-ba29-4472-815b-0ebf4a126c6e', 'Falcon Heavy | NROL-86', 'Falcon Heavy'],
  ['1c4ac109-3f35-42a0-9105-3205ae4a38d4', 'Falcon Heavy | USSF-155', 'Falcon Heavy'],
  ['06648c69-704b-439b-bcf5-cb394809b3b0', 'Falcon Heavy | WGS-12 (USSF-206)', 'Falcon Heavy'],
  ['7d1736d2-56e0-43a2-8665-4daf5074e65b', 'Falcon Heavy | Astrobotic-3', 'Falcon Heavy'],
  ['c6e0ad16-8a78-46bc-a693-fbbf5ea4db6f', 'Falcon Heavy | Dragonfly', 'Falcon Heavy'],
  ['26881916-98e7-40bc-954c-88ad6ac7a050', 'Falcon Heavy | ExoMars 2028 Rosalind Franklin rover', 'Falcon Heavy'],
  ['c019749b-6db8-406b-9704-098a246318dd', 'Falcon Heavy | Gateway PPE & HALO', 'Falcon Heavy'],
  ['f3385d65-5081-401e-a543-db7f471fe282', 'Falcon Heavy | NGG-2 (USSF-174)', 'Falcon Heavy'],
  ['fd017b9e-e227-4cb0-b383-ec821dd4a21b', 'Falcon Heavy | USSF-186', 'Falcon Heavy'],
  ['86d12414-1e9e-46f4-865a-0398f162cf28', 'Falcon Heavy | USSF-63', 'Falcon Heavy'],
  ['b97ec300-56b8-49b1-9a17-43b06bcae6f1', 'Starship | SpaceX HLS LEO Demo', 'Starship'],
  ['78775018-e720-4a50-a72c-e448a644c7a0', 'Starship | Superbird-9', 'Starship'],
  ['17b75859-1630-481b-9985-6eef21dcc9a8', 'Starship | Starlab', 'Starship'],
] as const

describe('Falcon Heavy and Starship stay on the manifests', () => {
  const named = LIVE.map(([id, name, rocketName]) => makeLaunch({ id, name, rocketName, missionName: name.split('|')[1]?.trim() ?? name }))
  const filler = Array.from({ length: 8 }, (_, index) => makeLaunch({ id: `filler-${index}`, name: `Falcon 9 | Starlink ${index}`, rocketName: 'Falcon 9' }))
  const board = [...filler, ...named]

  it('fails if a recorded Launch Library flight is missing from either manifest', () => {
    expect(LIVE.filter(([, , rocket]) => rocket === 'Falcon Heavy').length).toBe(12)
    expect(LIVE.filter(([, , rocket]) => rocket === 'Starship').length).toBe(3)
    const family = filterLaunches(board, {})
    const familySpaceX = filterLaunches(board, { who: 'spacex' })
    const pro = filterManifest(board, { company: '', rideshare: false, orbit: '', site: '' })
    const rideshare = filterManifest(board, { company: '', rideshare: true, orbit: '', site: '' })
    const preview = manifestBoard(board, true, 3)
    expect(missingHeavy(named, family)).toEqual([])
    expect(missingHeavy(named, familySpaceX)).toEqual([])
    expect(missingHeavy(named, pro)).toEqual([])
    expect(missingHeavy(named, rideshare)).toEqual([])
    expect(missingHeavy(named, preview)).toEqual([])
    expect(preview.filter(isStarshipOrHeavy)).toHaveLength(LIVE.length)
  })
})
