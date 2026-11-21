import { orbitSpecForLaunch, type OrbitSpec } from '@/lib/orbit-pattern'
import { rocketId } from '@/lib/rocket-photos'
import { isStillAhead } from '@/lib/schedule'
import { starshipChangeFor, type StarshipChange } from '@/lib/starship-changes'
import type { Launch } from '@/lib/types'

export type HistoryMission = {
  id: string
  name: string
  rocket: string
  rocketId: string
  when: string
  kid: string
  adult: string
  sourceTitle: string
  sourceUrl: string
  /** Drawing inputs for the shared globe. Omitted when the path is not known. */
  orbit?: OrbitSpec
  /** Verified Starship note, when the listing name matches a flight in the table. */
  change?: StarshipChange | null
}

/**
 * Optional words for a flight the board will recognize.
 * Leave kid and adult off and the page writes a plain line from the listing.
 * The date always comes from the listing, not from this seed.
 */
export type HistorySeed = {
  match: RegExp
  kid?: string
  adult?: string
  orbit?: OrbitSpec
}

export const HISTORY_SEEDS: HistorySeed[] = []

const NOTABLE = /starship|falcon heavy|saturn|shuttle|artemis|apollo|\bsls\b|new shepard|hubble/i

/**
 * Apollo 13 Mission Report, September 1970, NASA (mileage in nautical miles):
 * https://sma.nasa.gov/SignificantIncidents/assets/apollo-13-mission-report.pdf
 * S-IVB cutoff 00:12:30. Parking orbit 100.2 by 98.0 miles.
 * S-IVB second ignition (translunar injection) 2:35:46.4.
 * Oxygen tank 55:54:53. Splashdown 21 deg 38 min 24 sec south, 165 deg 21 min 42 sec west.
 * The report does not print a revolution count. From those two clocks the coast is 2 hours 23 minutes,
 * a little more than one and a half loops of a parking orbit at that height. The drawing uses that shape.
 * The story on the page follows https://www.nasa.gov/missions/apollo/apollo-13-mission-details/
 */
const APOLLO_13_ORBIT: OrbitSpec = {
  kind: 'lunar',
  inclinationDeg: 32,
  altitudeKm: 185,
  altitudeIsTypical: true,
  anchor: { lat: 28.6, lon: -80.6 },
  label: 'Free return',
  explanation:
    'The ship first circled Earth, then a burn sent it toward the Moon. A free return can loop behind the Moon and come home even if an engine does not fire again. Apollo 13 had left that path, then got back on it. This drawing is a sketch, not to scale. The Moon is much farther than it looks here.',
  detail: 'Parking loops, then translunar injection, then the loop behind the Moon, then splashdown. Not a measured track.',
  lunar: {
    parkingTurns: 1.6,
    launch: {
      lat: 28.6,
      lon: -80.6,
      label: 'Launch',
      detail: 'They left Kennedy Space Center on April 11, 1970.',
    },
    parking: {
      label: 'Parking orbit',
      detail:
        'The S-IVB shut down at 12 minutes 30 seconds. The mission report lists the parking orbit as 100.2 by 98.0 nautical miles. It does not print a revolution count. The next burn was 2 hours 23 minutes later, a little more than one and a half loops at that height. The loops here are a sketch.',
    },
    tli: {
      label: 'Translunar injection',
      detail: 'The S-IVB lit again at 2 hours 35 minutes 46 seconds. That burn left Earth orbit for the Moon.',
    },
    tank: {
      label: 'Oxygen tank problem',
      detail:
        'An oxygen tank in the service module failed at 55 hours 54 minutes 53 seconds after liftoff. The mark sits on the way to the Moon. It is not a measured position.',
    },
    apex: {
      lat: 5,
      lon: 40,
      label: 'Around the Moon',
      detail: 'They swung past the Moon and came back. Nobody landed. The Moon is much farther than this mark.',
    },
    splashdown: {
      lat: -21.64,
      lon: -165.362,
      label: 'Splashdown',
      detail: 'They landed in the South Pacific on April 17, 1970.',
    },
  },
}

/** Named public missions. Dates and roles are the ones on the cited page. No extra figures. */
export const HISTORY: HistoryMission[] = [
  {
    id: 'apollo-11',
    name: 'Apollo 11',
    rocket: 'Saturn V',
    rocketId: 'saturn-v',
    when: 'July 16 to 24, 1969',
    kid: 'Three people flew to the Moon. Two of them stepped onto it, then everyone came home.',
    adult: 'First crewed landing on the Moon. Neil Armstrong and Buzz Aldrin landed while Michael Collins stayed in orbit.',
    sourceTitle: 'NASA, Apollo 11',
    sourceUrl: 'https://www.nasa.gov/mission/apollo-11/',
    orbit: {
      kind: 'lunar',
      inclinationDeg: 32,
      altitudeKm: 185,
      altitudeIsTypical: true,
      anchor: { lat: 28.6, lon: -80.6 },
      label: 'Lunar transfer',
      explanation:
        'A sketch of a parking loop around Earth, the burn that leaves for the Moon, and the swing behind the Moon. Two people landed. The Moon is drawn close so the trip fits. It is not to scale, and this drawing does not use a counted number of loops.',
      detail: 'Parking orbit, then translunar injection, then the Moon. Not a measured track.',
      lunar: {
        parkingTurns: 1.5,
        launch: { lat: 28.6, lon: -80.6, label: 'Launch', detail: 'They left Kennedy Space Center for the Moon.' },
        apex: { lat: 8, lon: 30, label: 'The Moon', detail: 'Two people landed. One stayed in orbit around the Moon. The distance is not to scale.' },
        splashdown: { lat: 13, lon: -169, label: 'Return', detail: 'Everyone came back to Earth. This end of the line is a sketch, not a measured splash point.' },
      },
    },
  },
  {
    id: 'apollo-13',
    name: 'Apollo 13',
    rocket: 'Saturn V',
    rocketId: 'saturn-v',
    when: 'April 11 to 17, 1970',
    kid: 'Three people circled Earth, then flew toward the Moon. An oxygen tank failed. They used the Moon lander as a lifeboat, looped around the Moon, and splashed down in the ocean.',
    adult:
      'James Lovell, Jack Swigert, and Fred Haise left Kennedy Space Center on April 11, 1970. They circled Earth, then a burn sent them toward the Moon on a free return path. A course change aimed them at a landing. At 55 hours 54 minutes an oxygen tank in the service module failed. The crew powered up the lunar module and fired its engine to get back on a free return path. They swung around the Moon, made another burn to aim for the South Pacific, and splashed down on April 17, 1970. They did not land.',
    sourceTitle: 'NASA, Apollo 13',
    sourceUrl: 'https://www.nasa.gov/missions/apollo/apollo-13-mission-details/',
    orbit: APOLLO_13_ORBIT,
  },
  {
    id: 'apollo-8',
    name: 'Apollo 8',
    rocket: 'Saturn V',
    rocketId: 'saturn-v',
    when: 'December 21 to 27, 1968',
    kid: 'Three people flew around the Moon and came back. Nobody landed.',
    adult: 'First crewed flight to orbit the Moon.',
    sourceTitle: 'NASA, Apollo 8',
    sourceUrl: 'https://www.nasa.gov/mission/apollo-8/',
    orbit: {
      kind: 'lunar',
      inclinationDeg: 32,
      altitudeKm: 180,
      altitudeIsTypical: true,
      anchor: { lat: 28.6, lon: -80.6 },
      label: 'Around the Moon',
      explanation:
        'A sketch of a parking loop around Earth, the burn that leaves for the Moon, and the swing behind the Moon. Nobody landed. The Moon is drawn close so the trip fits. It is not to scale, and this drawing does not use a counted number of loops.',
      detail: 'Parking orbit, then translunar injection, then the Moon. Not a measured track.',
      lunar: {
        parkingTurns: 1.5,
        launch: { lat: 28.6, lon: -80.6, label: 'Launch', detail: 'They left Kennedy Space Center.' },
        apex: { lat: 0, lon: 50, label: 'Around the Moon', detail: 'They flew around the Moon. Nobody landed. The distance is not to scale.' },
        splashdown: { lat: 8, lon: -165, label: 'Return', detail: 'They came back to Earth. This end of the line is a sketch, not a measured splash point.' },
      },
    },
  },
  {
    id: 'sts-1',
    name: 'STS-1',
    rocket: 'Space Shuttle Columbia',
    rocketId: 'space-shuttle',
    when: 'April 12 to 14, 1981',
    kid: 'The first space shuttle flight. Columbia went up and landed like an airplane.',
    adult: 'First orbital flight of the Space Shuttle, flown by John Young and Robert Crippen.',
    sourceTitle: 'NASA, STS-1',
    sourceUrl: 'https://www.nasa.gov/mission/sts-1/',
    orbit: {
      kind: 'leo',
      inclinationDeg: 40,
      altitudeKm: 270,
      altitudeIsTypical: true,
      anchor: { lat: 28.6, lon: -80.6 },
      label: 'Low Earth orbit',
      explanation: 'A low orbit in a band north and south of the equator. The tilt and height are a sketch of that kind of path, not a quoted track.',
      detail: 'The shuttle flew around Earth, then came back and landed.',
    },
  },
  {
    id: 'hubble',
    name: 'Hubble deployment',
    rocket: 'Space Shuttle Discovery',
    rocketId: 'space-shuttle',
    when: 'April 24, 1990',
    kid: 'A shuttle carried a big telescope into space so it could look past the air.',
    adult: 'STS-31 deployed the Hubble Space Telescope from Discovery.',
    sourceTitle: 'NASA, Hubble',
    sourceUrl: 'https://www.nasa.gov/mission/hubble-space-telescope/',
    orbit: {
      kind: 'leo',
      inclinationDeg: 28.5,
      altitudeKm: 540,
      altitudeIsTypical: true,
      anchor: { lat: 28.5, lon: -80.6 },
      label: 'Low Earth orbit',
      explanation: 'A low orbit that stays closer to the equator than a polar path. The line is a sketch of that kind of path, not Hubble today.',
      detail: 'The telescope rides this kind of low path so it can look past the air.',
    },
  },
  {
    id: 'falcon-heavy-demo',
    name: 'Falcon Heavy test flight',
    rocket: 'Falcon Heavy',
    rocketId: 'falcon-heavy',
    when: 'February 6, 2018',
    kid: 'A very large rocket flew for the first time and sent a car toward the Sun.',
    adult: 'First Falcon Heavy flight. The payload was a Tesla Roadster on a heliocentric orbit.',
    sourceTitle: 'Falcon Heavy test flight',
    sourceUrl: 'https://en.wikipedia.org/wiki/Falcon_Heavy_test_flight',
    orbit: {
      kind: 'escape',
      inclinationDeg: 28.5,
      altitudeKm: 0,
      altitudeIsTypical: true,
      anchor: { lat: 28.6, lon: -80.6 },
      label: 'Around the Sun',
      explanation: 'The test flight sent a car onto a path around the Sun. The line leaves Earth. It is a sketch, not the car track.',
      detail: 'This path does not stay in orbit around Earth.',
    },
  },
]

export function historyForRocket(rocketIdValue: string, missions: HistoryMission[] = HISTORY): HistoryMission[] {
  return missions.filter((item) => item.rocketId === rocketIdValue)
}

/** A completed flight worth adding under History without a hand written story. */
export function isNotableCompleted(launch: Launch, now = Date.now()): boolean {
  if (isStillAhead(launch, now)) return false
  if (launch.historical) return true
  return NOTABLE.test(`${launch.name} ${launch.rocketName}`)
}

/**
 * Curated flights first, then completed notable flights from the board.
 * A seed can add words or an orbit. The date, name, and source still come from the listing.
 * Starship notes attach by flight number when that flight is verified.
 */
export function assembleHistory(launches: Launch[], now = Date.now(), seeds: HistorySeed[] = HISTORY_SEEDS): HistoryMission[] {
  const curated = HISTORY
  const covered = new Set(curated.map((item) => item.name.toLowerCase()))
  const rolled = launches
    .filter((launch) => isNotableCompleted(launch, now))
    .filter((launch) => !covered.has(launch.name.toLowerCase()))
    .filter((launch) => !curated.some((item) => launch.name.toLowerCase().includes(item.name.toLowerCase())))
    .sort((a, b) => Date.parse(b.net ?? '') - Date.parse(a.net ?? ''))
    .slice(0, 8)
    .map((launch) => fromLaunch(launch, seeds))
  return [...curated, ...rolled]
}

function fromLaunch(launch: Launch, seeds: HistorySeed[]): HistoryMission {
  const seed = seeds.find((item) => item.match.test(`${launch.name} ${launch.rocketName}`))
  const orbit = seed?.orbit ?? orbitSpecForLaunch(launch) ?? undefined
  const change = starshipChangeFor(launch.name)
  const orbitName = launch.orbitName
  const kid =
    seed?.kid ??
    (orbitName
      ? `${launch.rocketName} has flown. The listing calls the path ${orbitName}.`
      : `${launch.rocketName} has flown. The public listing calls the result ${launch.statusName}.`)
  const adult = seed?.adult ?? `${launch.name}. ${launch.statusName}.${orbitName ? ` Target path: ${orbitName}.` : ''}`
  return {
    id: `board-${launch.id}`,
    name: launch.name,
    rocket: launch.rocketName,
    rocketId: rocketId(launch.rocketName),
    when: historyWhen(launch.net),
    kid,
    adult,
    sourceTitle: launch.infoUrl ? 'Public page' : 'Launch Library 2',
    sourceUrl: launch.infoUrl?.startsWith('https://') ? launch.infoUrl : `https://ll.thespacedevs.com/2.3.0/launches/${launch.id}/`,
    orbit,
    change,
  }
}

export function historyWhen(net: string | null): string {
  if (!net) return 'Date not listed'
  const date = new Date(net)
  if (!Number.isFinite(date.getTime())) return 'Date not listed'
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`
}
