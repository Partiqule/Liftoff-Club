import { resolveCompany } from '@/lib/companies'
import { parseDurationSeconds } from '@/lib/duration'
import { buildManifest } from '@/lib/manifest'
import type { Agency, Launch, PayloadHint, TimelineEvent } from '@/lib/types'

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function numberish(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return null
}

function coord(value: unknown, min: number, max: number): number | null {
  const parsed = numberish(value)
  if (parsed == null || parsed < min || parsed > max) return null
  return parsed
}

function readAgency(value: unknown): Agency | null {
  const item = record(value)
  if (!item) return null
  const name = text(item.name)
  if (!name) return null
  const countries = Array.isArray(item.country) ? item.country : []
  const country = text(record(countries[0])?.name)
  const siteUrl = text(item.info_url) ?? text(item.wiki_url)
  return {
    name,
    abbrev: text(item.abbrev),
    description: text(item.description),
    country,
    siteUrl,
    type: text(record(item.type)?.name),
    companyId: resolveCompany(name, { description: text(item.description), siteUrl }).id,
  }
}

function readPayloadHint(value: unknown): PayloadHint | null {
  const wrapper = record(value)
  if (!wrapper) return null
  const nested = record(wrapper.payload)
  const item = nested ?? wrapper
  const name = text(item.name)
  if (!name) return null
  const operator = readAgency(item.operator)
  const manufacturer = readAgency(item.manufacturer)
  const company = operator ?? manufacturer
  const typeName = text(record(item.type)?.name) ?? text(item.type)
  return {
    name,
    company: company?.name ?? null,
    companyId: company?.companyId ?? (company?.name ? resolveCompany(company.name).id : null),
    companyDescription: company?.description ?? null,
    kind: typeName,
    description: text(item.description),
    count: numberish(wrapper.amount) ?? 1,
    siteUrl: text(item.info_link) ?? text(item.wiki_link) ?? company?.siteUrl ?? null,
  }
}

function cleanCraft(name: string | null): string | null {
  if (!name) return null
  if (/unknown|tbd|placeholder/i.test(name)) return null
  return name
}

function readTimeline(value: unknown): TimelineEvent[] {
  if (!Array.isArray(value)) return []
  const events: TimelineEvent[] = []
  for (const entry of value) {
    const item = record(entry)
    if (!item) continue
    const type = record(item.type)
    const abbrev = text(type?.abbrev) ?? text(type?.name) ?? text(item.abbrev)
    const offset = parseDurationSeconds(text(item.relative_time))
    if (!abbrev || offset == null) continue
    events.push({
      abbrev,
      description: text(type?.description) ?? abbrev,
      offsetSec: offset,
    })
  }
  return events.sort((a, b) => a.offsetSec - b.offsetSec)
}

export function normalizeLaunch(value: unknown): Launch | null {
  const item = record(value)
  if (!item) return null
  const id = text(item.id)
  const name = text(item.name)
  if (!id || !name) return null

  const provider = readAgency(item.launch_service_provider) ?? {
    name: 'Unknown provider',
    abbrev: null,
    description: null,
    country: null,
    siteUrl: null,
    type: null,
    companyId: resolveCompany('Unknown provider').id,
  }
  const rocket = record(item.rocket)
  const configuration = record(rocket?.configuration)
  const families = Array.isArray(configuration?.families) ? configuration.families : []
  const rocketName = text(configuration?.name) ?? name.split('|')[0]?.trim() ?? 'Rocket'
  const mission = record(item.mission)
  const orbit = record(mission?.orbit)
  const pad = record(item.pad)
  const location = record(pad?.location)
  const status = record(item.status)
  const customers = (Array.isArray(mission?.agencies) ? mission.agencies : [])
    .map(readAgency)
    .filter((agency): agency is Agency => Boolean(agency))

  const payloadHints = (Array.isArray(rocket?.payloads) ? rocket.payloads : [])
    .map(readPayloadHint)
    .filter((hint): hint is PayloadHint => Boolean(hint))

  const stages = Array.isArray(rocket?.spacecraft_stage) ? rocket.spacecraft_stage : []
  const stage = record(stages[0])
  const spacecraft = record(stage?.spacecraft)
  const spacecraftConfig = record(spacecraft?.spacecraft_config)
  const spacecraftName = text(spacecraftConfig?.name) ?? text(spacecraft?.name)

  const launcherStages = Array.isArray(rocket?.launcher_stage) ? rocket.launcher_stage : []
  const booster = record(launcherStages[0])
  const launcher = record(booster?.launcher)
  const landing = record(booster?.landing)
  const landingLocation = record(landing?.landing_location)

  const videos = Array.isArray(item.vid_urls) ? item.vid_urls : []
  const videoRecords = videos.map(record).filter((entry): entry is Record<string, unknown> => Boolean(entry))
  const webcasts = videoRecords
    .map((video) => {
      const url = text(video.url)
      if (!url) return null
      return { title: text(video.title) ?? 'Webcast', url }
    })
    .filter((video): video is { title: string; url: string } => Boolean(video))
  const official = videoRecords.find((video) => /official/i.test(text(record(video.type)?.name) ?? ''))
  const video = official ?? videoRecords[0]
  const updates = (Array.isArray(item.updates) ? item.updates : [])
    .map((entry) => {
      const update = record(entry)
      const comment = text(update?.comment) ?? text(update?.description)
      if (!comment) return null
      return { at: text(update?.created_on) ?? text(update?.created_at), text: comment }
    })
    .filter((update): update is { at: string | null; text: string } => Boolean(update))
    .slice(0, 8)
  const infos = Array.isArray(item.info_urls) ? item.info_urls : []
  const info = record(infos[0])
  const probability = numberish(item.probability)
  const programs = (Array.isArray(item.program) ? item.program : [])
    .map((entry) => text(record(entry)?.name))
    .filter((name): name is string => Boolean(name))

  const partial = {
    id,
    name,
    provider,
    rocketName,
    rocketFamily: text(record(families[0])?.name),
    missionName: text(mission?.name),
    missionType: text(mission?.type),
    missionDescription: text(mission?.description),
    orbitName: text(orbit?.name),
    orbitAbbrev: text(orbit?.abbrev),
    customers,
    padName: text(pad?.name) ?? 'Pad not listed',
    padLocation: text(location?.name),
    padLat: coord(pad?.latitude, -90, 90),
    padLon: coord(pad?.longitude, -180, 180),
    net: text(item.net),
    windowStart: text(item.window_start),
    windowEnd: text(item.window_end),
    precision: text(record(item.net_precision)?.name),
    statusName: text(status?.name) ?? 'Unknown',
    statusAbbrev: text(status?.abbrev) ?? text(status?.name) ?? 'TBD',
    statusDescription: text(status?.description),
    webcastUrl: text(video?.url),
    webcastTitle: text(video?.title),
    webcasts,
    infoUrl: text(info?.url),
    timeline: readTimeline(item.timeline),
    updates,
    lastUpdated: text(item.last_updated),
    probability: probability != null && probability >= 0 && probability <= 100 ? probability : null,
    weatherConcerns: text(item.weather_concerns),
    boosterSerial: text(launcher?.serial_number),
    boosterFlights: numberish(booster?.launcher_flight_number),
    boosterReused: typeof booster?.reused === 'boolean' ? booster.reused : null,
    boosterCareerFlights: numberish(launcher?.flights),
    boosterSuccessfulLandings: numberish(launcher?.successful_landings),
    boosterAttemptedLandings: numberish(launcher?.attempted_landings),
    previousFlightName: text(record(booster?.previous_flight)?.name),
    landingDescription: text(landing?.description),
    landingLocation: text(landingLocation?.name),
    spacecraftName: cleanCraft(spacecraftName),
    spacecraftDestination: text(stage?.destination),
    payloadHints,
    programs,
    featured: /spacex/i.test(provider.name) || provider.abbrev === 'SpX',
  }

  return { ...partial, manifest: buildManifest(partial) }
}

export function normalizeLaunches(values: unknown): Launch[] {
  if (!Array.isArray(values)) return []
  const launches = values.map(normalizeLaunch).filter((launch): launch is Launch => Boolean(launch))
  return launches.sort((a, b) => {
    if (!a.net && !b.net) return 0
    if (!a.net) return 1
    if (!b.net) return -1
    return Date.parse(a.net) - Date.parse(b.net)
  })
}
