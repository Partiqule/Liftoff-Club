export type CatalogObject = {
  objectType: string | null
  objectId: string | null
  launchDate: string | null
  decayDate: string | null
}

export type ConstellationCounts = {
  launched: number
  inOrbit: number
  launchesThisYear: number
}

function clean(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function readCatalogObject(value: unknown): CatalogObject | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  return {
    objectType: clean(typeof record.OBJECT_TYPE === 'string' ? record.OBJECT_TYPE : null),
    objectId: clean(typeof record.OBJECT_ID === 'string' ? record.OBJECT_ID : null),
    launchDate: clean(typeof record.LAUNCH_DATE === 'string' ? record.LAUNCH_DATE : null),
    decayDate: clean(typeof record.DECAY_DATE === 'string' ? record.DECAY_DATE : null),
  }
}

function launchKey(object: CatalogObject): string | null {
  const designator = object.objectId?.toUpperCase().match(/^(\d{4}-\d{3})/)
  if (designator) return designator[1]
  if (object.launchDate) return `date:${object.launchDate}`
  return null
}

/** Payload rows only. Rocket bodies and debris are not satellites. */
export function tallyCatalog(records: CatalogObject[], year: number): ConstellationCounts {
  const payloads = records.filter((record) => record.objectType === 'PAY')
  const launches = new Set<string>()
  for (const record of payloads) {
    const key = launchKey(record)
    const inYear = record.launchDate?.startsWith(String(year)) || key?.startsWith(String(year))
    if (inYear && key) launches.add(key)
  }
  return {
    launched: payloads.length,
    inOrbit: payloads.filter((record) => !record.decayDate).length,
    launchesThisYear: launches.size,
  }
}

export type AheadLaunch = {
  name: string
  missionName: string | null
  rocketName: string
  net: string | null
}

export function countAheadThisYear(launches: AheadLaunch[], pattern: RegExp, year: number, now: number): number {
  return launches.filter((launch) => {
    if (!pattern.test(`${launch.name} ${launch.missionName ?? ''} ${launch.rocketName}`)) return false
    if (!launch.net) return false
    const when = Date.parse(launch.net)
    if (!Number.isFinite(when) || when < now) return false
    return new Date(when).getUTCFullYear() === year
  }).length
}
