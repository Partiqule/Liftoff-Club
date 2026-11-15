export type ParsedTle = {
  name: string
  line1: string
  line2: string
}

const MU_KM = 398600.4418

export function parseTle(text: string): ParsedTle[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)
  const sats: ParsedTle[] = []
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim()
    const next = lines[index + 1]?.trim()
    if (!line || !next || !line.startsWith('1 ') || !next.startsWith('2 ')) continue
    const previous = index > 0 ? lines[index - 1].trim() : ''
    const name = previous && !previous.startsWith('1 ') && !previous.startsWith('2 ') ? previous : 'SATELLITE'
    sats.push({ name, line1: line, line2: next })
    index += 1
  }
  return sats
}

export function tleEpochValue(line1: string): number {
  const raw = line1.slice(18, 32).trim()
  const yearPart = Number(raw.slice(0, 2))
  const day = Number(raw.slice(2))
  if (!Number.isFinite(yearPart) || !Number.isFinite(day)) return 0
  const year = yearPart >= 57 ? 1900 + yearPart : 2000 + yearPart
  return year * 1000 + day
}

export function meanMotion(line2: string): number {
  return Number(line2.slice(52, 63).trim())
}

export function altitudeKmFromMotion(revPerDay: number): number {
  if (!Number.isFinite(revPerDay) || revPerDay <= 0) return Number.NaN
  const n = (revPerDay * 2 * Math.PI) / 86400
  const semiMajor = Math.cbrt(MU_KM / (n * n))
  return semiMajor - 6378.137
}

export function inclinationDeg(line2: string): number {
  return Number(line2.slice(8, 16).trim())
}

export function raanDeg(line2: string): number {
  return Number(line2.slice(17, 25).trim())
}

/**
 * Keep a small, spread-out sample of recent Starlink satellites.
 * Propagating the whole constellation is too heavy for a phone, and a fresh
 * train is the one families can actually see.
 */
export function selectStarlink(sats: ParsedTle[], limit = 24): ParsedTle[] {
  const enriched = sats
    .map((sat) => ({
      sat,
      alt: altitudeKmFromMotion(meanMotion(sat.line2)),
      epoch: tleEpochValue(sat.line1),
      raan: raanDeg(sat.line2),
      inc: inclinationDeg(sat.line2),
    }))
    .filter((item) => item.alt > 300 && item.alt < 620 && item.epoch > 0 && Number.isFinite(item.raan))
    .sort((a, b) => b.epoch - a.epoch)

  const chosen: ParsedTle[] = []
  const seen = new Set<string>()
  const add = (sat: ParsedTle) => {
    const id = sat.line1.slice(2, 7).trim()
    if (seen.has(id) || chosen.length >= limit) return false
    seen.add(id)
    chosen.push(sat)
    return true
  }

  for (const item of enriched.slice(0, 8)) add(item.sat)

  const bins = new Map<string, typeof enriched>()
  for (const item of enriched) {
    const key = `${Math.round(item.inc)}:${Math.round(item.raan / 15)}`
    const list = bins.get(key)
    if (list) list.push(item)
    else bins.set(key, [item])
  }
  const queues = [...bins.values()]
  let progressed = true
  while (chosen.length < limit && progressed) {
    progressed = false
    for (const queue of queues) {
      while (queue.length > 0 && chosen.length < limit) {
        const next = queue.shift()
        if (!next) break
        if (add(next.sat)) {
          progressed = true
          break
        }
      }
    }
  }
  return chosen
}

export function displaySatName(name: string, kind: 'iss' | 'starlink'): string {
  if (kind === 'iss') return 'ISS'
  const match = name.match(/(\d{3,5})/)
  return match ? `Starlink ${match[1]}` : 'Starlink'
}

export function noradId(line1: string): string {
  return line1.slice(2, 7).trim()
}

export type OmmRecord = {
  OBJECT_NAME?: string
  OBJECT_ID?: string
  EPOCH?: string
  MEAN_MOTION?: number
  ECCENTRICITY?: number
  INCLINATION?: number
  RA_OF_ASC_NODE?: number
  ARG_OF_PERICENTER?: number
  MEAN_ANOMALY?: number
  NORAD_CAT_ID?: number
  ELEMENT_SET_NO?: number
  REV_AT_EPOCH?: number
  BSTAR?: number
  MEAN_MOTION_DOT?: number
  MEAN_MOTION_DDOT?: number
  CLASSIFICATION_TYPE?: string
  EPHEMERIS_TYPE?: number
}

/** Build a two line element from a CelesTrak JSON or CSV row. Catalog numbers above 99999 are skipped. */
export function tleFromOmm(row: OmmRecord): ParsedTle | null {
  const cat = row.NORAD_CAT_ID
  if (cat == null || !Number.isInteger(cat) || cat < 1 || cat > 99999) return null
  if (!row.EPOCH || row.MEAN_MOTION == null || row.INCLINATION == null) return null
  const catalog = String(cat).padStart(5, '0')
  const designator = designatorField(row.OBJECT_ID ?? '')
  const epoch = epochField(row.EPOCH)
  if (!epoch) return null
  const line1 = checksum(
    `1 ${catalog}${row.CLASSIFICATION_TYPE || 'U'} ${designator} ${epoch} ${fixedDot(row.MEAN_MOTION_DOT ?? 0)} ${scientific(row.MEAN_MOTION_DDOT ?? 0)} ${scientific(row.BSTAR ?? 0)} ${row.EPHEMERIS_TYPE ?? 0} ${String(row.ELEMENT_SET_NO ?? 999).padStart(4, ' ').slice(-4)}`,
  )
  const line2 = checksum(
    `2 ${catalog} ${angle(row.INCLINATION)} ${angle(row.RA_OF_ASC_NODE ?? 0)} ${ecc(row.ECCENTRICITY ?? 0)} ${angle(row.ARG_OF_PERICENTER ?? 0)} ${angle(row.MEAN_ANOMALY ?? 0)} ${motion(row.MEAN_MOTION)}${String(row.REV_AT_EPOCH ?? 0).padStart(5, '0').slice(-5)}`,
  )
  if (line1.length !== 69 || line2.length !== 69) return null
  return { name: (row.OBJECT_NAME ?? 'SATELLITE').trim() || 'SATELLITE', line1, line2 }
}

export function parseGpJson(body: unknown): ParsedTle[] {
  if (!Array.isArray(body)) return []
  return body.map((row) => tleFromOmm(row as OmmRecord)).filter((row): row is ParsedTle => Boolean(row))
}

function designatorField(objectId: string): string {
  const match = objectId.toUpperCase().match(/^(\d{4})-(\d+)([A-Z]+)?$/)
  if (!match) return '        '
  const piece = (match[3] ?? '').slice(0, 3)
  const number = match[2].padStart(3, '0').slice(-3)
  return `${match[1].slice(2)}${number}${piece}`.padEnd(8, ' ').slice(0, 8)
}

function epochField(iso: string): string | null {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const year = date.getUTCFullYear()
  const start = Date.UTC(year, 0, 1)
  const day = (date.getTime() - start) / 86_400_000 + 1
  const yy = String(year).slice(-2)
  const dayText = day.toFixed(8).padStart(12, '0')
  return `${yy}${dayText}`
}

function fixedDot(value: number): string {
  const sign = value < 0 ? '-' : ' '
  const body = Math.abs(value).toFixed(8).replace(/^0/, '')
  return `${sign}${body}`.slice(0, 10)
}

function scientific(value: number): string {
  if (!Number.isFinite(value) || value === 0) return ' 00000+0'
  const sign = value < 0 ? '-' : ' '
  const abs = Math.abs(value)
  let exp = Math.floor(Math.log10(abs)) + 1
  let mant = Math.round((abs / 10 ** exp) * 100_000)
  if (mant === 100_000) {
    mant = 10_000
    exp += 1
  }
  const expSign = exp < 0 ? '-' : '+'
  return `${sign}${String(mant).padStart(5, '0')}${expSign}${Math.abs(exp)}`
}

function angle(value: number): string {
  return value.toFixed(4).padStart(8, ' ')
}

function ecc(value: number): string {
  return value.toFixed(7).replace('0.', '').padStart(7, '0').slice(0, 7)
}

function motion(value: number): string {
  return value.toFixed(8).padStart(11, ' ')
}

function checksum(body: string): string {
  let sum = 0
  for (const char of body) {
    if (char >= '0' && char <= '9') sum += Number(char)
    else if (char === '-') sum += 1
  }
  return `${body}${sum % 10}`
}

/** Last-resort station orbit. Real passes use a fresh CelesTrak element. */
export const ISS_FALLBACK: ParsedTle = {
  name: 'ISS (ZARYA)',
  line1: '1 25544U 98067A   26318.30312735  .00009396  00000+0  17615-3 0  9993',
  line2: '2 25544  51.6324 277.2306 0007380  24.2289 335.9045 15.49368089595028',
}
