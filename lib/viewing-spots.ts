export type ViewingSpot = {
  id: string
  name: string
  note: string
  access: 'free' | 'paid'
  mapsUrl: string
  sourceTitle: string
  sourceUrl: string
}

type SpotGroup = {
  id: string
  match: RegExp
  spots: ViewingSpot[]
}

function maps(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

/**
 * Public places named by the park or agency that runs them.
 * Notes do not claim a view that the source does not state.
 */
export const VIEWING_GROUPS: SpotGroup[] = [
  {
    id: 'cape',
    match: /cape canaveral|kennedy|ksc|merritt|port canaveral|titusville/i,
    spots: [
      {
        id: 'jetty-park',
        name: 'Jetty Park',
        note: 'Public park at Port Canaveral. The port charges admission.',
        access: 'paid',
        mapsUrl: maps('Jetty Park Port Canaveral'),
        sourceTitle: 'Port Canaveral, Jetty Park',
        sourceUrl: 'https://www.portcanaveral.com/Experiences/Recreation/Jetty-Park',
      },
      {
        id: 'space-view-park',
        name: 'Space View Park',
        note: 'City park in Titusville on the Indian River, across from the Kennedy pads.',
        access: 'free',
        mapsUrl: maps('Space View Park Titusville'),
        sourceTitle: 'City of Titusville, Space View Park',
        sourceUrl: 'https://www.titusville.com/Facilities',
      },
      {
        id: 'ksc-visitor',
        name: 'Kennedy Space Center Visitor Complex',
        note: 'Ticketed visitor complex. Launch day access follows the complex rules.',
        access: 'paid',
        mapsUrl: maps('Kennedy Space Center Visitor Complex'),
        sourceTitle: 'Kennedy Space Center Visitor Complex',
        sourceUrl: 'https://www.kennedyspacecenter.com/',
      },
    ],
  },
  {
    id: 'vandenberg',
    match: /vandenberg/i,
    spots: [
      {
        id: 'jalama',
        name: 'Jalama Beach County Park',
        note: 'Santa Barbara County park on the coast south of Vandenberg. Day use has a fee.',
        access: 'paid',
        mapsUrl: maps('Jalama Beach County Park'),
        sourceTitle: 'Santa Barbara County Parks, Jalama Beach',
        sourceUrl: 'https://www.countyofsb.org/parks/jalama',
      },
    ],
  },
  {
    id: 'starbase',
    match: /starbase|boca chica/i,
    spots: [
      {
        id: 'boca-chica-beach',
        name: 'Boca Chica Beach',
        note: 'Public beach at the end of State Highway 4. Cameron County closes it for some operations.',
        access: 'free',
        mapsUrl: maps('Boca Chica Beach Texas'),
        sourceTitle: 'Cameron County beaches',
        sourceUrl: 'https://www.cameroncountytx.gov/beaches/',
      },
      {
        id: 'isla-blanca',
        name: 'Isla Blanca Park',
        note: 'Cameron County park on South Padre Island, farther from the pad than Boca Chica Beach. Entry is paid.',
        access: 'paid',
        mapsUrl: maps('Isla Blanca Park South Padre Island'),
        sourceTitle: 'Cameron County, Isla Blanca Park',
        sourceUrl: 'https://www.cameroncountytx.gov/parks-and-recreation/isla-blanca-park/',
      },
    ],
  },
  {
    id: 'wallops',
    match: /wallops/i,
    spots: [
      {
        id: 'wallops-center',
        name: 'NASA Wallops Visitor Center',
        note: 'Public visitor center for Wallops Flight Facility. NASA posts the hours.',
        access: 'free',
        mapsUrl: maps('NASA Wallops Visitor Center'),
        sourceTitle: 'NASA Wallops Visitor Center',
        sourceUrl: 'https://www.nasa.gov/wallops/visitor-center/',
      },
      {
        id: 'assateague',
        name: 'Assateague Island National Seashore',
        note: 'National seashore across the water from Wallops. The park charges an entrance fee.',
        access: 'paid',
        mapsUrl: maps('Assateague Island National Seashore'),
        sourceTitle: 'National Park Service, Assateague Island',
        sourceUrl: 'https://www.nps.gov/asis/',
      },
    ],
  },
]

export function spotsForLaunch(padName: string, padLocation: string | null): ViewingSpot[] {
  const text = `${padName} ${padLocation ?? ''}`
  return VIEWING_GROUPS.find((group) => group.match.test(text))?.spots ?? []
}
