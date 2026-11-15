import { assertCited } from '@/lib/cited'

export type AiOrbitNote = {
  id: string
  companySlugs: string[]
  namePattern: string
  kid: string
  adult: string
  sourceUrl: string
  sourceTitle: string
  asOf: string
}

/**
 * Missions with a public source that says a computer on the spacecraft runs the
 * model. A company match is that mission, not a claim that every flight is AI.
 */
export const AI_ORBIT_NOTES: AiOrbitNote[] = [
  {
    id: 'phisat-2',
    companySlugs: ['european-space-agency'],
    namePattern: 'phisat-?2|φsat-?2|phi sat-?2',
    kid: 'PhiSat-2 is a small European satellite that looks at its own pictures in space and sends down the useful ones.',
    adult: 'PhiSat-2 is an ESA satellite with a computer that runs artificial intelligence on its Earth pictures before they are sent down.',
    sourceUrl: 'https://www.esa.int/missions/about-us/directorates/earth-observation-programmes/futureeo/fsat-2/phsat-2',
    sourceTitle: 'ESA, PhiSat-2',
    asOf: '2024-08-16',
  },
]

for (const note of AI_ORBIT_NOTES) {
  assertCited(
    {
      label: note.id,
      value: 1,
      unit: 'note',
      sourceUrl: note.sourceUrl,
      sourceTitle: note.sourceTitle,
      asOf: note.asOf,
      compareToInOrbit: false,
      note: null,
    },
    note.id,
  )
}

export function aiNotesForCompany(slug: string): AiOrbitNote[] {
  return AI_ORBIT_NOTES.filter((note) => note.companySlugs.includes(slug))
}

export function aiNotesForLaunch(launch: { name: string; missionName?: string | null; spacecraftName?: string | null }): AiOrbitNote[] {
  const text = `${launch.name} ${launch.missionName ?? ''} ${launch.spacecraftName ?? ''}`
  return AI_ORBIT_NOTES.filter((note) => new RegExp(note.namePattern, 'i').test(text))
}
