import { resolveCompany } from '@/lib/companies'
import { ROCKET_CATALOG } from '@/lib/rocket-catalog'

export type PublicEvent = {
  id: string
  name: string
  type: string
  when: string | null
  precision: string | null
  location: string | null
  description: string | null
  kid: string
  agencies: string[]
  agencySlugs: string[]
  launchNames: string[]
  rocketIds: string[]
  sourceUrl: string
  infoUrl: string | null
  infoTitle: string | null
}

const SKIP = /earnings|press event|public hearing/i

const KID: Record<string, string> = {
  'Static Fire': 'The engines light while the rocket stays held on the pad. This is not a launch.',
  'Wet Dress Rehearsal': 'The team loads the rocket as if it will fly, then stands down. This is not a launch.',
  Rehearsal: 'The team practices the countdown. This is not a launch.',
  Rollout: 'The vehicle moves out to the pad.',
  'Cryoproof Test': 'They load very cold fuel to see if the tanks hold. This is not a launch.',
  'Ambient Pressure Test': 'They check the tank at normal pressure. This is not a launch.',
  'Abort Test': 'They practice stopping a flight before it goes to space.',
  'Test Flight': 'This listing is a test flight, not a regular cargo run.',
  'Vehicle Testing': 'The team is testing the vehicle. This is not a launch unless the name says so.',
  Docking: 'Two spacecraft meet and connect.',
  'Spacecraft Berthing': 'A spacecraft is attached to a station.',
  'Spacecraft Undocking': 'A spacecraft lets go of a station.',
  'Spacecraft Landing': 'A spacecraft comes back down.',
  'Spacecraft Capture': 'A vehicle tries to catch a returning spacecraft.',
  EVA: 'A person goes outside the spacecraft.',
  'Sounding Rocket Launch': 'A small rocket goes up and comes back down, without staying in orbit.',
}

/** Launch Library prose often uses an en dash or an em dash. The club does not. */
export function plainSpoken(value: string): string {
  return value
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/\s+,/g, ',')
    .replace(/,\s*,+/g, ',')
    .replace(/\s{2,}/g, ' ')
    .replace(/,\s*\./g, '.')
    .trim()
}

export function normalizeEvents(values: unknown): PublicEvent[] {
  if (!Array.isArray(values)) return []
  return values.map(normalizeEvent).filter((event): event is PublicEvent => Boolean(event))
}

export function normalizeEvent(value: unknown): PublicEvent | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Record<string, unknown>
  const id = text(item.id)
  const name = text(item.name)
  if (!id || !name) return null
  const typeRecord = record(item.type)
  const type = text(typeRecord?.name) ?? 'Event'
  if (SKIP.test(type)) return null
  const agencies = (Array.isArray(item.agencies) ? item.agencies : [])
    .map((entry) => text(record(entry)?.name))
    .filter((entry): entry is string => Boolean(entry))
  const launchNames = (Array.isArray(item.launches) ? item.launches : [])
    .map((entry) => text(record(entry)?.name) ?? text(entry))
    .filter((entry): entry is string => Boolean(entry))
  const infos = Array.isArray(item.info_urls) ? item.info_urls : []
  const info = record(infos[0])
  const infoUrl = text(info?.url)
  const spokenType = plainSpoken(type)
  const spokenName = plainSpoken(name)
  return {
    id,
    name: spokenName,
    type: spokenType,
    when: text(item.date),
    precision: text(record(item.date_precision)?.name) ?? text(item.date_precision),
    location: text(item.location) ? plainSpoken(text(item.location) as string) : null,
    description: text(item.description) ? plainSpoken(text(item.description) as string) : null,
    kid: plainSpoken(KID[type] ?? `This is a ${spokenType} on the public event list.`),
    agencies,
    agencySlugs: agencies.map((agency) => resolveCompany(agency).slug),
    launchNames,
    rocketIds: rocketIdsFor(`${name} ${launchNames.join(' ')}`),
    sourceUrl: `https://ll.thespacedevs.com/2.3.0/events/${id}/`,
    infoUrl: infoUrl && infoUrl.startsWith('https://') ? infoUrl : null,
    infoTitle: text(info?.title) ? plainSpoken(text(info?.title) as string) : null,
  }
}

export function eventsForCompany(events: PublicEvent[], slug: string): PublicEvent[] {
  return events.filter((event) => event.agencySlugs.includes(slug))
}

export function eventsForRocket(events: PublicEvent[], rocketId: string): PublicEvent[] {
  return events.filter((event) => event.rocketIds.includes(rocketId))
}

function rocketIdsFor(text: string): string[] {
  const haystack = text.toLowerCase()
  return ROCKET_CATALOG.filter((rocket) => rocket.matches.some((match) => haystack.includes(match))).map((rocket) => rocket.id)
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function text(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
