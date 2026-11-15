export type CompanyProfile = {
  names: string[]
  brief: string
  kid: string
  careers?: string
  site?: string
}

/**
 * Short, hand-written introductions and public careers pages.
 * Used when a launch names a company. If a name is not here, the app falls
 * back to the description that came with the launch data and omits a careers
 * link rather than guessing a URL.
 */
export const COMPANIES: CompanyProfile[] = [
  {
    names: ['SpaceX', 'Space Exploration Technologies', 'Starlink'],
    brief: 'Designs and flies reusable rockets and the Starlink satellites that share internet from low Earth orbit.',
    kid: 'SpaceX builds the rockets, and the Starlink satellites that bounce internet down to Earth.',
    careers: 'https://www.spacex.com/careers',
    site: 'https://www.spacex.com',
  },
  {
    names: ['NASA', 'National Aeronautics and Space Administration', 'Jet Propulsion Laboratory', 'JPL'],
    brief: 'The United States civil space agency. It flies science missions, studies Earth, and sends people and cargo beyond it.',
    kid: 'NASA is the United States space agency. They study Earth and send people and robots to space.',
    careers: 'https://www.nasa.gov/careers/',
    site: 'https://www.nasa.gov',
  },
  {
    names: ['United States Space Force', 'U.S. Space Force', 'USSF', 'Space Force'],
    brief: 'The United States military service responsible for space operations.',
    kid: 'The Space Force is the part of the U.S. military that works on space.',
    careers: 'https://www.spaceforce.com/ways-to-serve',
    site: 'https://www.spaceforce.mil',
  },
  {
    names: ['National Reconnaissance Office', 'NRO'],
    brief: 'A United States government agency that builds and flies spy satellites.',
    kid: 'This is a government office. They have not said much about the cargo, and that is normal for this kind of mission.',
    site: 'https://www.nro.gov',
  },
  {
    names: ['NOAA', 'National Oceanic and Atmospheric Administration'],
    brief: 'The U.S. science agency for weather, oceans, and the atmosphere. Its satellites watch storms.',
    kid: 'NOAA watches weather. Their satellites help people know when a storm is coming.',
    careers: 'https://www.noaa.gov/jobs',
    site: 'https://www.noaa.gov',
  },
  {
    names: ['Blue Origin'],
    brief: 'Builds the New Glenn orbital rocket and the New Shepard suborbital rocket.',
    kid: 'Blue Origin builds rockets, including a very tall one called New Glenn.',
    careers: 'https://www.blueorigin.com/careers',
    site: 'https://www.blueorigin.com',
  },
  {
    names: ['Rocket Lab', 'Rocket Lab USA'],
    brief: 'Flies the Electron small rocket and is building the larger Neutron rocket.',
    kid: 'Rocket Lab flies a smaller rocket called Electron, often carrying one special satellite.',
    careers: 'https://www.rocketlabusa.com/careers/',
    site: 'https://www.rocketlabusa.com',
  },
  {
    names: ['United Launch Alliance', 'ULA'],
    brief: 'Flies the Vulcan rocket for U.S. government and commercial missions.',
    kid: 'United Launch Alliance flies big rockets, mostly for the government and for science.',
    careers: 'https://www.ulalaunch.com/careers',
    site: 'https://www.ulalaunch.com',
  },
  {
    names: ['Northrop Grumman'],
    brief: 'Builds rockets, spacecraft, and the Cygnus cargo ship that delivers supplies to the space station.',
    kid: 'Northrop Grumman builds spacecraft, including a cargo ship that carries supplies to astronauts.',
    careers: 'https://www.northropgrumman.com/careers',
    site: 'https://www.northropgrumman.com',
  },
  {
    names: ['Lockheed Martin'],
    brief: 'Builds spacecraft, satellites, and parts of NASA vehicles such as Orion.',
    kid: 'Lockheed Martin builds spacecraft and satellites.',
    careers: 'https://www.lockheedmartinjobs.com/',
    site: 'https://www.lockheedmartin.com',
  },
  {
    names: ['Boeing'],
    brief: 'Builds aircraft and spacecraft, including the Starliner crew capsule.',
    kid: 'Boeing builds airplanes and also spacecraft that can carry people.',
    careers: 'https://jobs.boeing.com/',
    site: 'https://www.boeing.com',
  },
  {
    names: ['European Space Agency', 'ESA'],
    brief: 'The space agency of Europe. It flies science missions and partners on the space station.',
    kid: 'The European Space Agency is how many countries in Europe explore space together.',
    careers: 'https://www.esa.int/About_Us/Careers_at_ESA',
    site: 'https://www.esa.int',
  },
  {
    names: ['Arianespace', 'ArianeGroup', 'Ariane Group'],
    brief: 'Builds and flies the Ariane rockets from Europe’s spaceport in French Guiana.',
    kid: 'Ariane rockets launch from the jungle in South America and carry satellites for Europe and the world.',
    careers: 'https://www.ariane.group/en/careers/',
    site: 'https://www.arianespace.com',
  },
  {
    names: ['JAXA', 'Japan Aerospace Exploration Agency', 'Mitsubishi Heavy Industries'],
    brief: 'Japan’s space agency and its main rocket builder fly the H3 rocket and science missions.',
    kid: 'This is Japan’s space team. They fly rockets and send science missions.',
    careers: 'https://www.mhi.com/careers',
    site: 'https://www.jaxa.jp',
  },
  {
    names: ['ISRO', 'Indian Space Research Organisation'],
    brief: 'India’s space agency. It flies PSLV and LVM3 rockets for Earth observation, navigation, and exploration.',
    kid: 'ISRO is India’s space agency. Their rockets carry satellites and science missions.',
    careers: 'https://www.isro.gov.in/Careers.html',
    site: 'https://www.isro.gov.in',
  },
  {
    names: ['Firefly Aerospace', 'Firefly'],
    brief: 'Builds the Alpha small rocket and spacecraft for cislunar missions.',
    kid: 'Firefly builds a small rocket and ships that head toward the Moon.',
    careers: 'https://fireflyspace.com/careers/',
    site: 'https://fireflyspace.com',
  },
  {
    names: ['Relativity Space'],
    brief: 'Builds rockets with large 3D-printed structures.',
    kid: 'Relativity builds rockets, and they print a lot of the metal with giant printers.',
    careers: 'https://www.relativityspace.com/careers',
    site: 'https://www.relativityspace.com',
  },
  {
    names: ['Axiom Space', 'Axiom'],
    brief: 'Flies private astronaut missions to the space station and is building a commercial station.',
    kid: 'Axiom takes visitors and researchers to the space station.',
    careers: 'https://www.axiomspace.com/careers',
    site: 'https://www.axiomspace.com',
  },
  {
    names: ['Sierra Space'],
    brief: 'Builds the Dream Chaser spaceplane and inflatable space habitats.',
    kid: 'Sierra Space is building a small spaceplane that can come home to a runway.',
    careers: 'https://www.sierraspace.com/careers/',
    site: 'https://www.sierraspace.com',
  },
  {
    names: ['Planet Labs', 'Planet'],
    brief: 'Operates a fleet of small satellites that photograph Earth every day.',
    kid: 'Planet flies lots of small satellites that take pictures of Earth.',
    careers: 'https://www.planet.com/careers/',
    site: 'https://www.planet.com',
  },
  {
    names: ['BlackSky'],
    brief: 'Takes satellite pictures of Earth for companies and governments.',
    kid: 'BlackSky takes pictures of Earth from small satellites.',
    careers: 'https://blacksky.com/company/careers/',
    site: 'https://blacksky.com',
  },
  {
    names: ['Spire', 'Spire Global'],
    brief: 'Flies small satellites that listen to ships, planes, and the weather.',
    kid: 'Spire’s little satellites listen for ships, planes, and weather.',
    careers: 'https://spire.com/careers/',
    site: 'https://spire.com',
  },
  {
    names: ['Capella Space', 'Capella'],
    brief: 'Radar satellites that can picture Earth at night and through clouds.',
    kid: 'Capella’s satellites can take pictures even when it is cloudy or dark.',
    careers: 'https://www.capellaspace.com/careers/',
    site: 'https://www.capellaspace.com',
  },
  {
    names: ['ICEYE'],
    brief: 'A Finnish company flying radar satellites for flood, storm, and ice monitoring.',
    kid: 'ICEYE flies radar satellites that can see the ground through clouds.',
    careers: 'https://www.iceye.com/careers',
    site: 'https://www.iceye.com',
  },
  {
    names: ['Maxar', 'Maxar Technologies'],
    brief: 'Builds high-resolution Earth imaging satellites and spacecraft parts.',
    kid: 'Maxar builds satellites that take very sharp pictures of Earth.',
    careers: 'https://www.maxar.com/careers',
    site: 'https://www.maxar.com',
  },
  {
    names: ['Viasat'],
    brief: 'Provides satellite internet and secure communications.',
    kid: 'Viasat uses satellites to share internet and phone signals.',
    careers: 'https://careers.viasat.com/',
    site: 'https://www.viasat.com',
  },
  {
    names: ['SES'],
    brief: 'Operates communications satellites that carry television, data, and aviation links.',
    kid: 'SES flies satellites that carry TV and internet signals.',
    careers: 'https://www.ses.com/careers',
    site: 'https://www.ses.com',
  },
  {
    names: ['Intelsat'],
    brief: 'Operates a large fleet of communications satellites.',
    kid: 'Intelsat’s satellites help carry television and data around the world.',
    careers: 'https://www.intelsat.com/careers/',
    site: 'https://www.intelsat.com',
  },
  {
    names: ['Eutelsat', 'OneWeb', 'Eutelsat OneWeb'],
    brief: 'Operates communications satellites, including the OneWeb low-Earth-orbit internet constellation.',
    kid: 'Eutelsat and OneWeb fly satellites that share internet and video.',
    careers: 'https://www.eutelsat.com/en/careers.html',
    site: 'https://www.eutelsat.com',
  },
  {
    names: ['Iridium'],
    brief: 'Runs a constellation of satellites for satellite phones and tracking, including over the oceans and poles.',
    kid: 'Iridium’s satellites let people make calls from the middle of the ocean.',
    careers: 'https://www.iridium.com/company/careers/',
    site: 'https://www.iridium.com',
  },
  {
    names: ['Amazon', 'Kuiper', 'Project Kuiper', 'Amazon Kuiper'],
    brief: 'Amazon’s Project Kuiper is building a satellite internet constellation.',
    kid: 'Project Kuiper is Amazon’s group of internet satellites.',
    careers: 'https://www.amazon.jobs/en/teams/project-kuiper',
    site: 'https://www.aboutamazon.com/what-we-do/devices-services/project-kuiper',
  },
  {
    names: ['AST SpaceMobile', 'AST & Science'],
    brief: 'Building satellites meant to talk directly to ordinary mobile phones.',
    kid: 'AST SpaceMobile wants satellites that can talk to a normal phone.',
    careers: 'https://ast-science.com/careers/',
    site: 'https://ast-science.com',
  },
  {
    names: ['iQPS', 'Institute for Q-shu Pioneers of Space'],
    brief: 'A Japanese company flying small radar satellites to image Earth.',
    kid: 'iQPS is a Japanese company. Their satellites take radar pictures of Earth.',
    site: 'https://i-qps.net/en/',
  },
  {
    names: ['Synspective'],
    brief: 'A Japanese company building a constellation of radar satellites.',
    kid: 'Synspective flies radar satellites that can see the ground through clouds.',
    careers: 'https://synspective.com/careers/',
    site: 'https://synspective.com',
  },
  {
    names: ['HawkEye 360', 'Hawkeye 360'],
    brief: 'Satellites that locate radio signals on Earth, used for maritime awareness and emergency beacons.',
    kid: 'HawkEye 360’s satellites listen for radio signals, including distress calls.',
    careers: 'https://www.he360.com/careers/',
    site: 'https://www.he360.com',
  },
  {
    names: ['York Space Systems', 'York'],
    brief: 'Builds small satellite buses used by government and commercial customers.',
    kid: 'York builds the bodies of small satellites for other people’s missions.',
    careers: 'https://www.yorkspacesystems.com/careers/',
    site: 'https://www.yorkspacesystems.com',
  },
  {
    names: ['Astranis'],
    brief: 'Builds small geostationary satellites to bring broadband to specific countries and regions.',
    kid: 'Astranis builds smaller satellites that hover over one part of Earth to share internet.',
    careers: 'https://www.astranis.com/careers',
    site: 'https://www.astranis.com',
  },
  {
    names: ['Impulse Space'],
    brief: 'Builds orbital transfer vehicles and thrusters that move satellites after launch.',
    kid: 'Impulse Space builds the little space tugs that carry satellites to the right orbit.',
    careers: 'https://www.impulsespace.com/careers',
    site: 'https://www.impulsespace.com',
  },
  {
    names: ['Stoke Space'],
    brief: 'Developing a fully reusable rocket.',
    kid: 'Stoke Space is building a rocket they hope can fly again and again.',
    careers: 'https://www.stokespace.com/careers',
    site: 'https://www.stokespace.com',
  },
  {
    names: ['Voyager Technologies', 'Voyager Space', 'Nanoracks'],
    brief: 'A space company that has gathered several businesses, including satellite servicing and station work.',
    kid: 'Voyager is a space company that works on stations and satellite missions.',
    careers: 'https://voyagertechnologies.com/careers/',
    site: 'https://voyagertechnologies.com',
  },
  {
    names: ['Airbus', 'Airbus Defence and Space', 'Airbus Defense and Space'],
    brief: 'Builds satellites, spacecraft, and aircraft, including European science and communications missions.',
    kid: 'Airbus builds airplanes and also satellites.',
    careers: 'https://www.airbus.com/en/careers',
    site: 'https://www.airbus.com',
  },
  {
    names: ['L3Harris'],
    brief: 'Builds space sensors, communications payloads, and satellite components.',
    kid: 'L3Harris builds instruments and radios that ride on satellites.',
    careers: 'https://careers.l3harris.com/',
    site: 'https://www.l3harris.com',
  },
  {
    names: ['Roscosmos', 'Russian Federal Space Agency'],
    brief: 'Russia’s state space corporation. It flies Soyuz rockets and crew missions.',
    kid: 'Roscosmos is Russia’s space agency. Soyuz rockets are theirs.',
    site: 'https://en.roscosmos.ru',
  },
  {
    names: ['China Aerospace Science and Technology Corporation', 'CASC', 'China National Space Administration', 'CNSA'],
    brief: 'China’s main state rocket and spacecraft organizations.',
    kid: 'This is China’s state space team. They fly the Long March rockets.',
    site: 'https://www.cnsa.gov.cn',
  },
]

/**
 * A company the family app can name, and a later business product can claim.
 * `id` and `slug` are the same stable key. `claimedBy` stays null until a
 * future product adds ownership. Do not put a person, account, or cookie here.
 */
export type CompanyRecord = {
  id: string
  slug: string
  name: string
  brief: string
  kid: string
  careersUrl: string | null
  siteUrl: string | null
  cataloged: boolean
  claimedBy: null
}

/** Stable slug. The first catalog name is canonical; do not reorder it. */
export function companySlug(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || 'unknown-company'
}

const CATALOG: CompanyRecord[] = COMPANIES.map((company) => {
  const name = company.names[0] ?? 'Unknown company'
  const id = companySlug(name)
  return {
    id,
    slug: id,
    name,
    brief: company.brief,
    kid: company.kid,
    careersUrl: company.careers ?? null,
    siteUrl: company.site ?? null,
    cataloged: true,
    claimedBy: null,
  }
})

const BY_SLUG = new Map(CATALOG.map((company) => [company.slug, company]))

export function listCatalog(): CompanyRecord[] {
  return CATALOG
}

export function getCatalogCompany(slug: string): CompanyRecord | null {
  return BY_SLUG.get(slug) ?? null
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const INDEX = COMPANIES.flatMap((company, index) =>
  company.names.map((name) => ({ key: normalizeName(name), record: CATALOG[index] })),
).sort((a, b) => b.key.length - a.key.length)

export function lookupCompany(name: string | null | undefined): CompanyRecord | null {
  if (!name) return null
  const key = normalizeName(name)
  if (!key) return null
  const exact = INDEX.find((entry) => entry.key === key && entry.record)
  if (exact?.record) return exact.record
  const partial = INDEX.find((entry) => entry.record && entry.key.length >= 6 && (key.includes(entry.key) || entry.key.includes(key)))
  return partial?.record ?? null
}

/** Catalog hit, or a stable id minted from the public name. Never a person. */
export function resolveCompany(
  name: string,
  extras?: { description?: string | null; siteUrl?: string | null },
): CompanyRecord {
  const known = lookupCompany(name)
  if (known) {
    return known.siteUrl || !extras?.siteUrl ? known : { ...known, siteUrl: extras.siteUrl }
  }
  const display = name.trim() || 'Unknown company'
  const id = companySlug(display)
  const description = extras?.description?.replace(/\s+/g, ' ').trim() || null
  return {
    id,
    slug: id,
    name: display,
    brief: description
      ? firstSentences(description, 2, 320)
      : `${display} is named on a public launch listing. A plain-language brief was not in our notes.`,
    kid: description ? firstSentences(description, 1, 160) : `${display} is tied to this flight.`,
    careersUrl: null,
    siteUrl: extras?.siteUrl ?? null,
    cataloged: false,
    claimedBy: null,
  }
}

export function firstSentences(text: string, count: number, maxLength: number): string {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  const parts = cleaned.split(/(?<=[.!?])\s+/)
  let taken = ''
  for (let i = 0; i < parts.length && i < count; i += 1) {
    const next = taken ? `${taken} ${parts[i]}` : parts[i]
    if (next.length > maxLength && taken) break
    taken = next
    if (taken.length >= maxLength) break
  }
  if (taken.length > maxLength) return `${taken.slice(0, maxLength - 1).trim()}…`
  return taken
}
