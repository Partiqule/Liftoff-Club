import { assertCited, type CitedFigure } from '@/lib/cited'

export type ConstellationProfile = {
  id: string
  name: string
  operator: string
  companySlug: string | null
  celestrakGroup: string
  launchPattern: string
  kid: string
  adult: string
  satellites: CitedFigure | null
  bandwidth: CitedFigure | null
}

/**
 * Stated sizes and capacity only. Every number has a public source.
 * Live satellite counts are not stored here. They come from the catalog.
 */
export const CONSTELLATIONS: ConstellationProfile[] = [
  {
    id: 'starlink',
    name: 'Starlink',
    operator: 'SpaceX',
    companySlug: 'spacex',
    celestrakGroup: 'starlink',
    launchPattern: 'starlink',
    kid: 'Starlink satellites share internet with houses, ships, and farms that do not have a cable in the ground.',
    adult: 'SpaceX flies this low Earth orbit network for broadband.',
    satellites: {
      label: 'Gen2 satellites authorized by the FCC',
      value: 15000,
      unit: 'satellites',
      sourceUrl: 'https://docs.fcc.gov/public/attachments/DA-26-36A1.txt',
      sourceTitle: 'FCC DA 26-36',
      asOf: '2026-01-09',
      compareToInOrbit: false,
      note: 'This grant covers the second generation only. Satellites already in orbit include earlier generations, so these two numbers are not a percent.',
    },
    bandwidth: null,
  },
  {
    id: 'kuiper',
    name: 'Amazon Leo',
    operator: 'Amazon',
    companySlug: 'amazon',
    celestrakGroup: 'kuiper',
    launchPattern: 'kuiper|amazon leo',
    kid: 'Amazon Leo satellites are meant to share internet with places that do not have a strong connection yet.',
    adult: 'Amazon is building this low Earth orbit broadband constellation. It was announced as Project Kuiper.',
    satellites: {
      label: 'Satellites authorized by the FCC',
      value: 3232,
      unit: 'satellites',
      sourceUrl: 'https://docs.fcc.gov/public/attachments/DA-26-553A1.pdf',
      sourceTitle: 'FCC DA 26-553',
      asOf: '2026-06-05',
      compareToInOrbit: true,
      note: 'The 2020 grant was for 3,236 satellites. This order states that a later modification reduced the authorization to 3,232.',
    },
    bandwidth: null,
  },
  {
    id: 'oneweb',
    name: 'OneWeb',
    operator: 'Eutelsat',
    companySlug: 'eutelsat',
    celestrakGroup: 'oneweb',
    launchPattern: 'oneweb',
    kid: 'OneWeb satellites share internet from a path that also reaches the far north and south.',
    adult: 'Eutelsat flies this low Earth orbit network for broadband, including coverage toward the poles.',
    satellites: {
      label: 'First generation satellites in the plan',
      value: 648,
      unit: 'satellites',
      sourceUrl: 'https://www.mynewsdesk.com/eutelsat/pressreleases/eutelsat-enters-leo-space-through-investment-in-oneweb-3094017',
      sourceTitle: 'Eutelsat press release',
      asOf: '2021-04-27',
      compareToInOrbit: true,
      note: 'Eutelsat described a first generation of 648 satellites. Spares can put the catalog count above that plan.',
    },
    bandwidth: {
      label: 'Stated first generation capacity',
      value: 1.1,
      unit: 'terabits per second',
      sourceUrl: 'https://www.mynewsdesk.com/eutelsat/pressreleases/eutelsat-enters-leo-space-through-investment-in-oneweb-3094017',
      sourceTitle: 'Eutelsat press release',
      asOf: '2021-04-27',
      compareToInOrbit: false,
      note: 'This is the capacity named in that announcement. It is not a measurement of the network today.',
    },
  },
  {
    id: 'iridium',
    name: 'Iridium',
    operator: 'Iridium',
    companySlug: 'iridium',
    celestrakGroup: 'iridium-NEXT',
    launchPattern: 'iridium',
    kid: 'Iridium satellites let a phone call go through from the ocean or near the poles.',
    adult: 'Iridium flies a crosslinked constellation for voice and data, including over oceans and polar regions.',
    satellites: {
      label: 'Satellites in the operational constellation',
      value: 66,
      unit: 'satellites',
      sourceUrl: 'https://investor.iridium.com/2019-02-06-Iridium-Declares-Victory-3-Billion-Satellite-Constellation-Upgrade-Complete',
      sourceTitle: 'Iridium press release',
      asOf: '2019-02-06',
      compareToInOrbit: false,
      note: 'Iridium said 66 satellites make the operational constellation and that nine more were launched as spares. The catalog count includes spares, so these numbers are not a percent.',
    },
    bandwidth: null,
  },
]

for (const profile of CONSTELLATIONS) {
  for (const figure of [profile.satellites, profile.bandwidth]) {
    if (figure) assertCited(figure, profile.id)
  }
}
