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
  /** Newest payload launch date in the catalog file, YYYY-MM-DD, or null. */
  latestLaunchDate: string | null
}

function clean(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function readCatalogObject(value: unknown): CatalogObject | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const text = (key: string) => {
    const raw = record[key]
    return typeof raw === 'string' ? raw : null
  }
  return {
    objectType: clean(text('OBJECT_TYPE')),
    objectId: clean(text('OBJECT_ID')),
    launchDate: clean(text('LAUNCH_DATE')),
    decayDate: clean(text('DECAY_DATE')),
  }
}

export function parseCatalogCsv(text: string): CatalogObject[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)
  const header = splitCsv(lines[0] ?? '').map((cell) => cell.trim())
  const records: CatalogObject[] = []
  for (const line of lines.slice(1)) {
    const cells = splitCsv(line)
    const row: Record<string, string> = {}
    header.forEach((key, index) => {
      row[key] = cells[index] ?? ''
    })
    const parsed = readCatalogObject(row)
    if (parsed) records.push(parsed)
  }
  return records
}

function splitCsv(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      quoted = !quoted
      continue
    }
    if (char === ',' && !quoted) {
      cells.push(current)
      current = ''
      continue
    }
    current += char
  }
  cells.push(current)
  return cells
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
    latestLaunchDate: latestPayloadLaunch(payloads),
  }
}

function latestPayloadLaunch(payloads: CatalogObject[]): string | null {
  let best: string | null = null
  for (const record of payloads) {
    const day = record.launchDate?.slice(0, 10) ?? ''
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue
    if (!best || day > best) best = day
  }
  return best
}

export type AheadLaunch = {
  name: string
  missionName: string | null
  rocketName: string
  net: string | null
}

/** Keep the last good tally when a later fetch for that group did not answer. A miss is not zero. */
export function keepKnownCounts(
  previous: Record<string, ConstellationCounts>,
  incoming: Record<string, ConstellationCounts | null>,
): Record<string, ConstellationCounts> {
  const next = { ...previous }
  for (const [id, counts] of Object.entries(incoming)) {
    if (!counts || !Number.isFinite(counts.inOrbit)) continue
    next[id] = counts
  }
  return next
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
