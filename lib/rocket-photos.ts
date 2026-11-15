export type RocketPhoto = {
  id: string
  /** Lowercase phrases. The rocket name must include one of them. */
  matches: string[]
  file: string
  alt: string
  author: string
  license: string
  sourceUrl: string
}

/**
 * Only public domain, CC0, CC BY, and CC BY-SA.
 * NonCommercial, NoDerivatives, and a blank license are rejected.
 */
export function licenseAllowed(license: string): boolean {
  const text = license.toLowerCase().replace(/\s+/g, ' ').trim()
  if (!text) return false
  if (/non-?commercial|\bnc\b|no-?deriv|\bnd\b|fair use|all rights reserved/.test(text)) return false
  if (text.includes('public domain') || text.includes('cc0')) return true
  if (/cc[ -]?by-sa\b/.test(text) || /cc[ -]?by\b/.test(text)) return true
  return false
}

export const ROCKET_PHOTOS: RocketPhoto[] = [
  {
    id: 'starship',
    matches: ['starship'],
    file: '/rockets/starship.jpg',
    alt: 'Starship lifts off on integrated flight test 5.',
    author: 'Steve Jurvetson',
    license: 'CC BY 2.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Liftoff_of_SpaceX_IFT-5_(54064037095).jpg',
  },
  {
    id: 'falcon-9',
    matches: ['falcon 9'],
    file: '/rockets/falcon-9.jpg',
    alt: 'A Falcon 9 lifts off from Vandenberg with the GRACE Follow-On spacecraft.',
    author: 'Bill Ingalls, NASA',
    license: 'Public domain',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:GRACE-FO_Launch_(NHQ201805220019).jpg',
  },
  {
    id: 'electron',
    matches: ['electron'],
    file: '/rockets/electron.jpg',
    alt: 'A Rocket Lab Electron climbs from Mahia, New Zealand.',
    author: 'NASA Kennedy Space Center',
    license: 'Public domain',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Rocket_Lab_PREFIRE_and_Ice_Launch_(KSC-20240605-PH-RKL01_0005).jpg',
  },
  {
    id: 'vulcan',
    matches: ['vulcan'],
    file: '/rockets/vulcan.jpg',
    alt: 'A Vulcan Centaur lifts off from Cape Canaveral.',
    author: 'U.S. Space Force, Airman 1st Class Collin Wesson',
    license: 'Public domain',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Vulcan_Cert_2_Launch_(8699035).jpg',
  },
  {
    id: 'soyuz',
    matches: ['soyuz'],
    file: '/rockets/soyuz.jpg',
    alt: 'A Soyuz rocket lifts off from Baikonur.',
    author: 'Bill Ingalls, NASA',
    license: 'Public domain',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Soyuz_TMA-9_launch.jpg',
  },
  {
    id: 'pslv',
    matches: ['pslv'],
    file: '/rockets/pslv.jpg',
    alt: 'A PSLV standing on display.',
    author: 'Ank Kumar',
    license: 'CC BY-SA 4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:ISRO_PSLV_(2020)_02.jpg',
  },
  {
    id: 'ariane-6',
    matches: ['ariane'],
    file: '/rockets/ariane-6.jpg',
    alt: 'An Ariane 6 upper stage after it was unpacked at a test site.',
    author: 'DLR',
    license: 'CC BY 3.0 de',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Ariane_6_upper_stage_unpacked_at_DLR_Lampoldshausen_01.jpg',
  },
]

for (const photo of ROCKET_PHOTOS) {
  if (!licenseAllowed(photo.license)) throw new Error(`${photo.id} has a license this app will not use`)
  if (!photo.sourceUrl.startsWith('https://')) throw new Error(`${photo.id} needs a source URL`)
  if (!photo.author.trim()) throw new Error(`${photo.id} needs an author`)
}

export function findRocketPhoto(rocketName: string): RocketPhoto | null {
  const text = rocketName.toLowerCase()
  return ROCKET_PHOTOS.find((photo) => photo.matches.some((match) => text.includes(match))) ?? null
}

export function rocketId(rocketName: string): string {
  const fromName = rocketName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return findRocketPhoto(rocketName)?.id ?? (fromName || 'rocket')
}
