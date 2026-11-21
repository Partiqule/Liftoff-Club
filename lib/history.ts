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
 * Splashdown 21 deg 38 min 24 sec south, 165 deg 21 min 42 sec west, from the
 * Apollo 13 Mission Report, September 1970, NASA:
 * https://sma.nasa.gov/SignificantIncidents/assets/apollo-13-mission-report.pdf
 * The tank event is at 55 hours 54 minutes 53 seconds after liftoff in that report.
 * The story on the page follows https://www.nasa.gov/missions/apollo/apollo-13-mission-details/
 */
const APOLLO_13_ORBIT: OrbitSpec = {
  kind: 'lunar',
  inclinationDeg: 32,
  altitudeKm: 180,
  altitudeIsTypical: true,
  anchor: { lat: 28.6, lon: -80.6 },
  label: 'Free return',
  explanation:
    'A free return leaves Earth, loops behind the Moon, and comes home even if an engine does not fire again. Apollo 13 had left that path, then got back on it. This drawing is a sketch. The Moon is much farther than it looks here, and the path is not to scale.',
  detail: 'The line leaves Earth, goes behind the Moon, and comes back. It is a sketch, not a measured track.',
  lunar: {
    launch: {
      lat: 28.6,
      lon: -80.6,
      label: 'Launch',
      detail: 'They left Florida on April 11, 1970.',
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
      altitudeKm: 180,
      altitudeIsTypical: true,
      anchor: { lat: 28.6, lon: -80.6 },
      label: 'Lunar transfer',
      explanation: 'A sketch of the trip from Earth, around the Moon, and back. Two people landed. The Moon is drawn close so the trip fits. It is not to scale.',
      detail: 'The line is a sketch of a lunar trip, not a measured track.',
      lunar: {
        launch: { lat: 28.6, lon: -80.6, label: 'Launch', detail: 'They left Florida for the Moon.' },
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
    kid: 'Three people were flying to the Moon when an oxygen tank failed. They used the Moon lander as a lifeboat, looped around the Moon, and splashed down in the ocean.',
    adult:
      'James Lovell, Jack Swigert, and Fred Haise left on April 11, 1970. The flight started on a free return path, then a course change aimed it at a landing. Nearly 56 hours after liftoff an oxygen tank in the service module failed. The crew powered up the lunar module and fired its engine to get back on a free return path. They swung around the Moon, made another burn to aim for the South Pacific, and splashed down on April 17, 1970. They did not land.',
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
      explanation: 'A sketch of a loop out to the Moon and back. Nobody landed. The Moon is drawn close so the trip fits. It is not to scale.',
      detail: 'The line leaves Earth, bends around the far end, and comes back.',
      lunar: {
        launch: { lat: 28.6, lon: -80.6, label: 'Launch', detail: 'They left Florida.' },
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
