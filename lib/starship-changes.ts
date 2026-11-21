/**
 * What changed from the previous integrated Starship flight.
 * Each note is limited to a claim on the cited page.
 * Flight 1 has no dedicated SpaceX recap at the old flight URL (it redirects to the launches index),
 * so that note cites the public launch list.
 * Flight 16 was still a future plan on the same list (no earlier than December 10, 2026) and has no note.
 * Single ship hops are a different series and are not given an integrated flight note.
 */

export type StarshipChange = {
  flight: number
  note: string
  sourceTitle: string
  sourceUrl: string
}

export const STARSHIP_CHANGES: StarshipChange[] = [
  {
    flight: 1,
    note: 'There was no stacked flight before this one. It was the first time the ship and the booster flew together. Engines shut down, the stack spun before the stages separated, and the launch mount was badly damaged.',
    sourceTitle: 'Wikipedia, List of Starship launches',
    sourceUrl: 'https://en.wikipedia.org/wiki/List_of_Starship_flights',
  },
  {
    flight: 2,
    note: 'All 33 booster engines finished the climb for the first time, and the ship lit its engines to separate while the two were still attached. A water cooled deflector on the pad stood up to the launch. The booster was lost after the return burn started, and the ship was lost near the end of its burn.',
    sourceTitle: 'SpaceX, Starship flight test 2',
    sourceUrl: 'https://www.spacex.com/launches/starship-flight-2',
  },
  {
    flight: 3,
    note: 'The ship finished its climb burn for the first time, opened and closed the payload door, and started a propellant transfer test. It did not relight an engine in space. The booster was lost during its landing burn, and the ship was lost during entry.',
    sourceTitle: 'SpaceX, Starship flight test 3',
    sourceUrl: 'https://www.spacex.com/launches/starship-flight-3',
  },
  {
    flight: 4,
    note: 'The booster made a soft splashdown in the Gulf of Mexico. The ship flew a controlled entry, then a flip and landing burn, and made a soft splashdown in the Indian Ocean.',
    sourceTitle: 'SpaceX, Starship flight test 4',
    sourceUrl: 'https://www.spacex.com/launches/starship-flight-4',
  },
  {
    flight: 5,
    note: 'The launch tower caught the booster on the first try. The ship splashed down in the Indian Ocean.',
    sourceTitle: 'SpaceX, Starship flight test 5',
    sourceUrl: 'https://www.spacex.com/launches/starship-flight-5',
  },
  {
    flight: 6,
    note: 'The tower catch was called off and the booster splashed down offshore. The ship lit one engine in space, flew a steeper descent with heat shield tests, and splashed down in the Indian Ocean.',
    sourceTitle: 'SpaceX, Starship flight test 6',
    sourceUrl: 'https://www.spacex.com/launches/starship-flight-6',
  },
  {
    flight: 7,
    note: 'A redesigned ship flew, and the tower caught the booster again. The ship lost contact about eight and a half minutes after liftoff. The flight page says a fire in the aft section led to the ship breaking up.',
    sourceTitle: 'SpaceX, Starship flight test 7',
    sourceUrl: 'https://www.spacex.com/launches/starship-flight-7',
  },
  {
    flight: 8,
    note: 'The tower caught the booster again. Before the ship finished its climb, an energetic event in the aft section cut several engines. Contact was lost about 9 minutes and 30 seconds after liftoff.',
    sourceTitle: 'SpaceX, Starship flight test 8',
    sourceUrl: 'https://www.spacex.com/launches/starship-flight-8/',
  },
  {
    flight: 9,
    note: 'The booster flew again, the first reflight in this program, and was lost during its landing burn. The ship reached space with extra joint preload, a nitrogen purge, and propellant drain changes. The payload door did not open, so the test satellites stayed aboard, and the engine relight was skipped.',
    sourceTitle: 'SpaceX, Starship flight test 9',
    sourceUrl: 'https://www.spacex.com/launches/starship-flight-9/',
  },
  {
    flight: 10,
    note: 'The ship released test satellites for the first time and lit an engine in space again. The booster splashed down after an engine was shut off on purpose. The ship made a soft splashdown in the Indian Ocean.',
    sourceTitle: 'SpaceX, Starship flight test 10',
    sourceUrl: 'https://www.spacex.com/launches/starship-flight-10/',
  },
  {
    flight: 11,
    note: 'Last flight of the second generation ship and the first generation booster, and the last launch from Pad 1 in its then current form. The ship released test satellites, lit an engine in space, and splashed down in the Indian Ocean. The booster splashed down after a landing burn meant to try ideas for the next booster.',
    sourceTitle: 'SpaceX, Starship flight test 11',
    sourceUrl: 'https://www.spacex.com/launches/starship-flight-11',
  },
  {
    flight: 12,
    note: 'First flight of the V3 ship and booster, the Raptor 3 engines, and Pad 2. The booster hit the water hard. The ship lost one vacuum engine, still reached its planned path, released test satellites plus two modified Starlink satellites, and splashed down.',
    sourceTitle: 'SpaceX, Starship flight test 12',
    sourceUrl: 'https://www.spacex.com/launches/starship-flight-12',
  },
  {
    flight: 13,
    note: 'First release of Starlink V3 satellites. The ship lit one engine in space and splashed down in one piece, so the heat shield could be seen intact. The booster hit the water hard.',
    sourceTitle: 'SpaceX, Starship flight test 13',
    sourceUrl: 'https://www.spacex.com/launches/starship-flight-13/',
  },
  {
    flight: 14,
    note: 'First flight to reach orbit, and the first to place working satellites there: 26 Starlink V3 satellites. One booster engine shut down on the way up. The team cut the time in orbit short and brought the ship down in the northern Pacific.',
    sourceTitle: 'SpaceX, Starship flight 14',
    sourceUrl: 'https://www.spacex.com/launches/starship-flight-14',
  },
  {
    flight: 15,
    note: 'The booster boostback burn ended early, so it splashed down offshore. The ship reached orbit, released 26 Starlink V3 satellites, spent more than 20 hours in space, and came back to the tower. The tower caught a ship for the first time.',
    sourceTitle: 'SpaceX, Starship flight 15',
    sourceUrl: 'https://www.spacex.com/launches/starship-flight-15/',
  },
]

const BY_FLIGHT = new Map(STARSHIP_CHANGES.map((item) => [item.flight, item]))

/** Flight number from a listing name. Null when the name is not a Starship flight. */
export function starshipFlightNumber(name: string): number | null {
  if (!/starship/i.test(name)) return null
  const patterns = [/starship\s+flight\s+(\d+)/i, /integrated\s+flight\s+test\s+(\d+)/i, /\bift[-\s]?(\d+)/i, /\bflight\s+(\d+)/i]
  for (const pattern of patterns) {
    const match = name.match(pattern)
    if (!match) continue
    const flight = Number(match[1])
    if (Number.isInteger(flight) && flight > 0) return flight
  }
  return null
}

/** A verified note for this listing, or null when the flight is unknown or not in the table. */
export function starshipChangeFor(name: string): StarshipChange | null {
  const flight = starshipFlightNumber(name)
  if (flight == null) return null
  return BY_FLIGHT.get(flight) ?? null
}
