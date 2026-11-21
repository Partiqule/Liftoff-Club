import { starlinkLaunchUrl } from '@/lib/celestrak-query'
import { altitudeKmFromMotion, meanMotion, noradId, parseTle, tleFromOmm, type OmmRecord, type ParsedTle } from '@/lib/tle-select'
import type { SkyElement, SkyKind } from '@/lib/sky-point'

export const SKY_STATIONS_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=JSON'
export const SKY_VISUAL_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=JSON'
export const SKY_HUBBLE_URL = 'https://celestrak.org/NORAD/elements/gp.php?CATNR=20580&FORMAT=JSON'
/** Recent launches only. This is not the full Starlink fleet file. */
export const SKY_RECENT_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=last-30-days&FORMAT=CSV'

const ISS_ID = '25544'
const TIANGONG_ID = '48274'
const HUBBLE_ID = '20580'
const STARLINK_WINDOW_MS = 60 * 24 * 60 * 60 * 1000
const STARLINK_TRAIN_COUNT = 8
const STARLINK_PER_TRAIN = 6
export const STARLINK_TOTAL_CAP = 48

const CAP: Record<SkyKind, number> = {
  station: 24,
  hubble: 4,
  starlink: STARLINK_TOTAL_CAP,
  bright: 80,
}

export function skyGroupUrls(): string[] {
  return [SKY_STATIONS_URL, SKY_VISUAL_URL, SKY_HUBBLE_URL]
}

export function friendlySatelliteName(raw: string, id: string, kind: SkyKind): string {
  if (id === HUBBLE_ID || /^HST\b/i.test(raw.trim())) return 'Hubble'
  if (id === ISS_ID || /ZARYA/i.test(raw)) return 'ISS'
  if (id === TIANGONG_ID || /TIANHE/i.test(raw)) return 'Tiangong'
  if (/^Starlink train\b/.test(raw.trim())) return raw.trim()
  if (kind === 'starlink' || /starlink/i.test(raw)) {
    const digits = raw.match(/(\d{3,6})/)
    return digits ? `Starlink ${digits[1]}` : 'Starlink'
  }
  const cleaned = raw.replace(/[—–-]/g, ' ').replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim()
  return cleaned || 'Satellite'
}

export function kindFor(rawName: string, id: string, origin: SkyKind): SkyKind {
  if (id === HUBBLE_ID || /^HST\b/i.test(rawName.trim())) return 'hubble'
  if (id === ISS_ID || /ZARYA/i.test(rawName)) return 'station'
  if (id === TIANGONG_ID || /TIANHE/i.test(rawName)) return 'station'
  return origin
}

export function assembleSkyElements(groups: {
  stations: ParsedTle[]
  hubble: ParsedTle[]
  starlink: ParsedTle[]
  visual: ParsedTle[]
}): SkyElement[] {
  const ranked: Array<{ tle: ParsedTle; origin: SkyKind }> = [
    ...groups.stations.map((tle) => ({ tle, origin: 'station' as const })),
    ...groups.hubble.map((tle) => ({ tle, origin: 'hubble' as const })),
    ...groups.starlink.map((tle) => ({ tle, origin: 'starlink' as const })),
    ...groups.visual.map((tle) => ({ tle, origin: 'bright' as const })),
  ]
  const seen = new Set<string>()
  const counts: Record<SkyKind, number> = { station: 0, hubble: 0, starlink: 0, bright: 0 }
  const objects: SkyElement[] = []
  for (const item of ranked) {
    const id = noradId(item.tle.line1)
    if (!id || seen.has(id)) continue
    if (!item.tle.line1.startsWith('1 ') || !item.tle.line2.startsWith('2 ')) continue
    const kind = kindFor(item.tle.name, id, item.origin)
    if (counts[kind] >= CAP[kind]) continue
    seen.add(id)
    counts[kind] += 1
    objects.push({
      noradId: id,
      name: friendlySatelliteName(item.tle.name, id, kind),
      kind,
      line1: item.tle.line1.trim(),
      line2: item.tle.line2.trim(),
    })
  }
  return collapseSharedStationOrbits(objects)
}

/** Docked modules share a station orbit. Keep ISS and Tiangong, and anything on its own path. */
export function collapseSharedStationOrbits(objects: SkyElement[]): SkyElement[] {
  const coreKeys = new Set(
    objects.filter((object) => object.noradId === ISS_ID || object.noradId === TIANGONG_ID).map((object) => orbitKey(object.line2)),
  )
  return objects.filter((object) => {
    if (object.kind !== 'station') return true
    if (object.noradId === ISS_ID || object.noradId === TIANGONG_ID) return true
    return !coreKeys.has(orbitKey(object.line2))
  })
}

function orbitKey(line2: string): string {
  const motion = Number(line2.slice(52, 63))
  return `${line2.slice(8, 16).trim()}|${line2.slice(17, 25).trim()}|${Number.isFinite(motion) ? motion.toFixed(3) : ''}`
}

/** Keep satellites from the newest launch groups. Skip the full fleet file. */
export function limitStarlinkGroups(groups: ParsedTle[][], cap = CAP.starlink): ParsedTle[] {
  const chosen: ParsedTle[] = []
  const seen = new Set<string>()
  for (const group of groups) {
    const inReach = group.filter((sat) => {
      const alt = altitudeKmFromMotion(meanMotion(sat.line2))
      return alt > 200 && alt < 800
    })
    const named = inReach.filter((sat) => /starlink/i.test(sat.name))
    for (const sat of named.length > 0 ? named : inReach) {
      if (chosen.length >= cap) return chosen
      const id = noradId(sat.line1)
      if (!id || seen.has(id)) continue
      seen.add(id)
      chosen.push(sat)
    }
  }
  return chosen
}

export function starlinkTrainName(launchedAt: string | null): string {
  const day = formatTrainDay(launchedAt)
  return day ? `Starlink train (launched ${day})` : 'Starlink train'
}

export function launchDesignator(objectId: string): string | null {
  const match = objectId.trim().toUpperCase().match(/^(\d{4})-(\d{1,4})/)
  if (!match) return null
  return `${match[1]}-${match[2].padStart(3, '0').slice(-3)}`
}

export function launchIsRecent(launchedAt: string | null, now: number): boolean {
  if (!launchedAt) return true
  const when = Date.parse(launchedAt)
  if (!Number.isFinite(when) || when > now) return false
  return now - when <= STARLINK_WINDOW_MS
}

/** Low, new Starlink trains from a mixed recent launch file. The full fleet file is never read. */
export function parseGpCsv(text: string): OmmRecord[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0)
  const header = (lines[0] ?? '').split(',').map((cell) => cell.trim())
  if (!header.includes('OBJECT_NAME') || !header.includes('NORAD_CAT_ID')) return []
  return lines.slice(1).map((line) => {
    const cells = line.split(',')
    const raw: Record<string, string> = {}
    header.forEach((key, index) => {
      raw[key] = (cells[index] ?? '').trim()
    })
    const num = (key: string) => {
      const value = Number(raw[key])
      return Number.isFinite(value) ? value : undefined
    }
    return {
      OBJECT_NAME: raw.OBJECT_NAME,
      OBJECT_ID: raw.OBJECT_ID,
      EPOCH: raw.EPOCH,
      MEAN_MOTION: num('MEAN_MOTION'),
      ECCENTRICITY: num('ECCENTRICITY'),
      INCLINATION: num('INCLINATION'),
      RA_OF_ASC_NODE: num('RA_OF_ASC_NODE'),
      ARG_OF_PERICENTER: num('ARG_OF_PERICENTER'),
      MEAN_ANOMALY: num('MEAN_ANOMALY'),
      NORAD_CAT_ID: num('NORAD_CAT_ID'),
      ELEMENT_SET_NO: num('ELEMENT_SET_NO'),
      REV_AT_EPOCH: num('REV_AT_EPOCH'),
      BSTAR: num('BSTAR'),
      MEAN_MOTION_DOT: num('MEAN_MOTION_DOT'),
      MEAN_MOTION_DDOT: num('MEAN_MOTION_DDOT'),
      CLASSIFICATION_TYPE: raw.CLASSIFICATION_TYPE,
      EPHEMERIS_TYPE: num('EPHEMERIS_TYPE') ?? 0,
    }
  })
}

/** Recent Starlink trains from a CelesTrak JSON array, an OMM CSV, or a three line element file. */
export function starlinkFromText(text: string, dates: Record<string, string>, now = Date.now()): ParsedTle[] {
  const trimmed = text.trim().replace(/^\uFEFF/, '')
  if (!trimmed) return []
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown
      const rows = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === 'object' && Array.isArray((parsed as { data?: unknown }).data)
          ? (parsed as { data: unknown[] }).data
          : []
      return trainsFromGp(rows, dates, now)
    } catch {
      return []
    }
  }
  const head = trimmed.slice(0, 1200)
  if (/OBJECT_NAME/i.test(head) && /NORAD_CAT_ID/i.test(head)) return trainsFromGp(parseGpCsv(trimmed), dates, now)
  return groupStarlinkTrains(parseTle(trimmed), dates, now)
}

export function trainsFromGp(rows: unknown[], dates: Record<string, string>, now = Date.now()): ParsedTle[] {
  const sats: ParsedTle[] = []
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const record = row as OmmRecord
    if (!/starlink/i.test(record.OBJECT_NAME ?? '')) continue
    const tle = tleFromOmm(record)
    if (tle) sats.push(tle)
  }
  return groupStarlinkTrains(sats, dates, now)
}

/**
 * Group low Starlink elements into a few trains.
 * A launch day from the library is only the label. An older day must not drop a satellite that is already in the recent file.
 */
export function groupStarlinkTrains(sats: ParsedTle[], dates: Record<string, string>, now = Date.now()): ParsedTle[] {
  const buckets = new Map<string, { designator: string; launchedAt: string | null; sats: ParsedTle[] }>()
  for (const tle of sats) {
    if (!/starlink/i.test(tle.name)) continue
    const alt = altitudeKmFromMotion(meanMotion(tle.line2))
    if (!(alt > 200 && alt < 800)) continue
    const designator = launchDesignator(objectIdFromTle(tle.line1))
    if (!designator) continue
    const known = dates[designator]
    const when = known ? Date.parse(known) : Number.NaN
    const launchedAt = Number.isFinite(when) && when < now + 86_400_000 ? known : null
    const bucket = buckets.get(designator) ?? { designator, launchedAt, sats: [] }
    if (!bucket.launchedAt && launchedAt) bucket.launchedAt = launchedAt
    bucket.sats.push(tle)
    buckets.set(designator, bucket)
  }
  const ordered = [...buckets.values()].sort((a, b) => {
    const ad = Date.parse(a.launchedAt ?? '')
    const bd = Date.parse(b.launchedAt ?? '')
    const aOk = Number.isFinite(ad)
    const bOk = Number.isFinite(bd)
    if (aOk && bOk && ad !== bd) return bd - ad
    if (aOk !== bOk) return aOk ? -1 : 1
    return b.designator.localeCompare(a.designator)
  })
  const chosen: ParsedTle[] = []
  for (const bucket of ordered.slice(0, STARLINK_TRAIN_COUNT)) {
    const name = starlinkTrainName(bucket.launchedAt)
    const visible = bucket.sats
      .slice()
      .sort((a, b) => altitudeKmFromMotion(meanMotion(a.line2)) - altitudeKmFromMotion(meanMotion(b.line2)))
    for (const sat of visible.slice(0, STARLINK_PER_TRAIN)) {
      if (chosen.length >= STARLINK_TOTAL_CAP) return chosen
      chosen.push({ ...sat, name })
    }
  }
  return chosen
}

/** Recent trains first, then the lowest remaining Starlinks, which read as the brightest. */
export function mergeVisibleStarlinks(primary: SkyElement[], extra: SkyElement[], cap = STARLINK_TOTAL_CAP): SkyElement[] {
  const seen = new Set<string>()
  const out: SkyElement[] = []
  const push = (item: SkyElement) => {
    if (!item.noradId || seen.has(item.noradId) || out.length >= cap) return
    seen.add(item.noradId)
    out.push(item)
  }
  for (const item of primary) push(item)
  const rest = extra
    .slice()
    .sort((a, b) => altitudeKmFromMotion(meanMotion(a.line2)) - altitudeKmFromMotion(meanMotion(b.line2)))
  for (const item of rest) push(item)
  return out
}

function objectIdFromTle(line1: string): string {
  const field = line1.slice(9, 17).trim().toUpperCase()
  const match = field.match(/^(\d{2})(\d{3})[A-Z]{0,3}$/)
  if (!match) return ''
  const yy = Number(match[1])
  const year = yy >= 57 ? 1900 + yy : 2000 + yy
  return `${year}-${match[2]}`
}

export function mergeSkyKinds(previous: SkyElement[], nextByKind: Partial<Record<SkyKind, SkyElement[] | null>>): SkyElement[] {
  const kinds: SkyKind[] = ['station', 'hubble', 'bright', 'starlink']
  const out: SkyElement[] = []
  for (const kind of kinds) {
    const incoming = nextByKind[kind]
    if (incoming && incoming.length > 0) out.push(...incoming)
    else out.push(...previous.filter((object) => object.kind === kind))
  }
  return out
}

export function visitorCatalogNotice(objectCount: number): string | null {
  return objectCount > 0 ? null : emptyCatalogNotice()
}

export function recentStarlinkDesignators(
  rows: Array<{ name?: string; net?: string; statusName?: string; designator?: string }>,
  now: number,
): string[] {
  const found: string[] = []
  const sorted = [...rows].sort((a, b) => Date.parse(b.net ?? '') - Date.parse(a.net ?? ''))
  for (const row of sorted) {
    const designator = row.designator?.trim()
    if (!designator || !starlinkLaunchUrl(designator)) continue
    if (!/starlink/i.test(row.name ?? '')) continue
    if (!/success/i.test(row.statusName ?? '')) continue
    const when = Date.parse(row.net ?? '')
    if (!Number.isFinite(when) || when > now || now - when > STARLINK_WINDOW_MS) continue
    if (!found.includes(designator)) found.push(designator)
    if (found.length >= STARLINK_TRAIN_COUNT) break
  }
  return found
}

export function catalogNotice(flags: {
  stations: boolean
  hubble: boolean
  visual: boolean
  starlink: 'ok' | 'empty' | 'fail'
  hasHubble: boolean
}): string | null {
  const missing: string[] = []
  if (!flags.stations) missing.push('space stations')
  if (!flags.hubble && !flags.hasHubble) missing.push('Hubble')
  if (!flags.visual) missing.push('bright satellites')
  if (flags.starlink === 'fail') missing.push('recent Starlink')
  const partial = missing.length === 0 ? null : missing.length === 1 ? `${capitalize(missing[0])} did not load. The other orbits are fresh.` : `Some orbit lists did not load (${missing.join(', ')}). The orbits that are here are fresh.`
  if (flags.starlink === 'empty') {
    const extra = 'No recent Starlink launch group was available.'
    return partial ? `${partial} ${extra}` : extra
  }
  return partial
}

export function staleCatalogNotice(fetchedAt: string): string {
  return `CelesTrak did not answer. Showing the last good orbits, saved ${formatSavedDay(fetchedAt)}. Positions can drift.`
}

export function emptyCatalogNotice(): string {
  return 'CelesTrak did not answer, and there is no saved orbit file yet. This page will not invent a position.'
}

export function formatSavedDay(iso: string): string {
  const time = Date.parse(iso)
  if (!Number.isFinite(time)) return 'earlier'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(time))
}

function formatTrainDay(iso: string | null): string | null {
  if (!iso) return null
  const time = Date.parse(iso)
  if (!Number.isFinite(time)) return null
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(time))
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
