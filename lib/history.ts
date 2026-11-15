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
  },
]

export function historyForRocket(rocketId: string): HistoryMission[] {
  return HISTORY.filter((item) => item.rocketId === rocketId)
}
