export type CatalogRocket = {
  id: string
  name: string
  matches: string[]
  summary: string
  sourceTitle: string
  sourceUrl: string
}

export const ROCKET_CATALOG: CatalogRocket[] = [
  { id: 'falcon-9', name: 'Falcon 9', matches: ['falcon 9'], summary: 'A two stage orbital rocket that flies often from Florida and California.', sourceTitle: 'SpaceX, Falcon 9', sourceUrl: 'https://www.spacex.com/vehicles/falcon-9/' },
  { id: 'falcon-heavy', name: 'Falcon Heavy', matches: ['falcon heavy'], summary: 'A heavy lift rocket with three Falcon 9 boosters side by side.', sourceTitle: 'SpaceX, Falcon Heavy', sourceUrl: 'https://www.spacex.com/vehicles/falcon-heavy/' },
  { id: 'starship', name: 'Starship', matches: ['starship'], summary: 'A large reusable ship and booster still in flight test.', sourceTitle: 'SpaceX, Starship', sourceUrl: 'https://www.spacex.com/vehicles/starship/' },
  { id: 'electron', name: 'Electron', matches: ['electron'], summary: 'A small orbital rocket that flies from New Zealand and Virginia.', sourceTitle: 'Rocket Lab, Electron', sourceUrl: 'https://www.rocketlabusa.com/launch/electron/' },
  { id: 'vulcan', name: 'Vulcan', matches: ['vulcan'], summary: 'An orbital rocket flown by United Launch Alliance.', sourceTitle: 'ULA, Vulcan', sourceUrl: 'https://www.ulalaunch.com/rockets/vulcan-centaur' },
  { id: 'new-glenn', name: 'New Glenn', matches: ['new glenn'], summary: 'A large orbital rocket flown by Blue Origin.', sourceTitle: 'Blue Origin, New Glenn', sourceUrl: 'https://www.blueorigin.com/new-glenn' },
  { id: 'sls', name: 'SLS', matches: ['sls', 'space launch system'], summary: 'NASA’s heavy rocket for Artemis flights toward the Moon.', sourceTitle: 'NASA, Space Launch System', sourceUrl: 'https://www.nasa.gov/humans-in-space/space-launch-system/' },
  { id: 'saturn-v', name: 'Saturn V', matches: ['saturn v', 'saturn'], summary: 'The rocket that carried Apollo crews toward the Moon.', sourceTitle: 'NASA, Saturn V', sourceUrl: 'https://www.nasa.gov/history/the-saturn-v/' },
  { id: 'space-shuttle', name: 'Space Shuttle', matches: ['space shuttle', 'shuttle'], summary: 'A winged orbiter that flew crews to orbit and landed on a runway.', sourceTitle: 'NASA, Space Shuttle', sourceUrl: 'https://www.nasa.gov/space-shuttle/' },
]

export function catalogRocket(id: string): CatalogRocket | null {
  return ROCKET_CATALOG.find((item) => item.id === id) ?? null
}
