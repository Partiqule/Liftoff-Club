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

/** Last-resort station orbit. Real passes use a fresh CelesTrak element. */
export const ISS_FALLBACK: ParsedTle = {
  name: 'ISS (ZARYA)',
  line1: '1 25544U 98067A   26318.30312735  .00009396  00000+0  17615-3 0  9993',
  line2: '2 25544  51.6324 277.2306 0007380  24.2289 335.9045 15.49368089595028',
}
