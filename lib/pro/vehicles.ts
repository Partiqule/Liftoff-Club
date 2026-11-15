export type VehicleCell =
  | { state: 'cited'; text: string; note: string; sourceUrl: string; sourceTitle: string; asOf: string }
  | { state: 'unpublished'; note: string }

export type VehicleRow = {
  id: string
  name: string
  provider: string
  providerSlug: string
  leo: VehicleCell
  sso: VehicleCell
  gto: VehicleCell
  price: VehicleCell
}

const AS_OF = '2026-11-15'

function cited(text: string, note: string, sourceUrl: string, sourceTitle: string): VehicleCell {
  return { state: 'cited', text, note, sourceUrl, sourceTitle, asOf: AS_OF }
}

function unpublished(note: string): VehicleCell {
  return { state: 'unpublished', note }
}

/** Published capacity and price lines. A missing public figure stays unpublished. */
export const VEHICLES: VehicleRow[] = [
  {
    id: 'falcon-9',
    name: 'Falcon 9',
    provider: 'SpaceX',
    providerSlug: 'spacex',
    leo: cited('22,800 kg', 'Payload to low Earth orbit on the vehicle page.', 'https://www.spacex.com/vehicles/falcon-9/', 'SpaceX, Falcon 9'),
    sso: unpublished('The vehicle page does not list a sun synchronous figure.'),
    gto: cited('8,300 kg', 'Payload to geosynchronous transfer orbit on the vehicle page.', 'https://www.spacex.com/vehicles/falcon-9/', 'SpaceX, Falcon 9'),
    price: unpublished('The vehicle page says to contact sales. The rideshare page lists plate mass and does not list a public dollar rate.'),
  },
  {
    id: 'falcon-heavy',
    name: 'Falcon Heavy',
    provider: 'SpaceX',
    providerSlug: 'spacex',
    leo: cited('63,800 kg', 'Payload to low Earth orbit on the vehicle page.', 'https://www.spacex.com/vehicles/falcon-heavy/', 'SpaceX, Falcon Heavy'),
    sso: unpublished('The vehicle page does not list a sun synchronous figure.'),
    gto: cited('26,700 kg', 'Payload to geosynchronous transfer orbit on the vehicle page.', 'https://www.spacex.com/vehicles/falcon-heavy/', 'SpaceX, Falcon Heavy'),
    price: unpublished('The vehicle page says to contact sales.'),
  },
  {
    id: 'starship',
    name: 'Starship',
    provider: 'SpaceX',
    providerSlug: 'spacex',
    leo: cited('More than 100 t', 'Fully reusable configuration, to orbit. The page does not split sun synchronous or geosynchronous transfer.', 'https://www.spacex.com/vehicles/starship/', 'SpaceX, Starship'),
    sso: unpublished('The vehicle page does not list a sun synchronous figure.'),
    gto: unpublished('The vehicle page does not list a geosynchronous transfer figure.'),
    price: cited(
      '$100 million per metric ton',
      'Lunar and Mars cargo flights, no earlier than 2028. A low Earth orbit launch price is not published on this page.',
      'https://www.spacex.com/vehicles/starship/',
      'SpaceX, Starship',
    ),
  },
  {
    id: 'electron',
    name: 'Electron',
    provider: 'Rocket Lab',
    providerSlug: 'rocket-lab',
    leo: cited('300 kg', 'Payload to low Earth orbit on the vehicle page.', 'https://www.rocketlabusa.com/launch/electron/', 'Rocket Lab, Electron'),
    sso: unpublished('The vehicle page does not list a sun synchronous figure.'),
    gto: unpublished('The vehicle page does not list a geosynchronous transfer figure.'),
    price: unpublished('The vehicle page does not list a public dollar rate.'),
  },
  {
    id: 'new-glenn',
    name: 'New Glenn',
    provider: 'Blue Origin',
    providerSlug: 'blue-origin',
    leo: cited('45 t', 'The page says 45 metric tons to low Earth orbit.', 'https://www.blueorigin.com/new-glenn', 'Blue Origin, New Glenn'),
    sso: unpublished('The vehicle page does not list a sun synchronous figure.'),
    gto: cited('More than 13 t', 'The page says more than 13 metric tons to geostationary transfer orbit.', 'https://www.blueorigin.com/new-glenn', 'Blue Origin, New Glenn'),
    price: unpublished('The vehicle page does not list a public dollar rate.'),
  },
  {
    id: 'vulcan',
    name: 'Vulcan',
    provider: 'United Launch Alliance',
    providerSlug: 'united-launch-alliance',
    leo: cited(
      '27,200 kg',
      'Six solid rocket boosters. Low Earth orbit reference is 200 km circular at 28.7 degrees.',
      'https://www.ulalaunch.com/rockets/vulcan-centaur',
      'ULA, Vulcan',
    ),
    sso: unpublished('The page lists a polar orbit, not a sun synchronous orbit.'),
    gto: cited(
      '14,500 kg',
      'Six solid rocket boosters. Geosynchronous transfer is 35,786 km by 185 km at 27.0 degrees.',
      'https://www.ulalaunch.com/rockets/vulcan-centaur',
      'ULA, Vulcan',
    ),
    price: unpublished('The vehicle page lists performance and does not list a public dollar rate.'),
  },
]

export function vehicleProblems(row: VehicleRow): string[] {
  const problems: string[] = []
  for (const cell of [row.leo, row.sso, row.gto, row.price]) {
    if (cell.state === 'unpublished') {
      if (/\d/.test(cell.note)) problems.push(`${row.id} unpublished note has a digit`)
      continue
    }
    if (!cell.sourceUrl.startsWith('https://')) problems.push(`${row.id} source must be https`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cell.asOf)) problems.push(`${row.id} as of date`)
    if (!cell.text.trim() || !cell.sourceTitle.trim()) problems.push(`${row.id} missing text`)
  }
  return problems
}
