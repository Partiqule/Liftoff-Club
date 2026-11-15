export type NetPoint = { at: string; net: string | null }

export type NetRecord = {
  name: string
  rocket: string
  provider: string
  points: NetPoint[]
}

export function recordNet(points: NetPoint[], net: string | null, at: string): NetPoint[] {
  const last = points[points.length - 1]
  if (last && last.net === net) return points
  return [...points, { at, net }].slice(-40)
}

/** Days a clock moved later. An earlier clock is not a slip. */
export function slipDays(points: NetPoint[]): number[] {
  const days: number[] = []
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]?.net
    const next = points[index]?.net
    if (!previous || !next) continue
    const delta = (Date.parse(next) - Date.parse(previous)) / 86_400_000
    if (Number.isFinite(delta) && delta > 0) days.push(delta)
  }
  return days
}

export function averageDays(days: number[]): number | null {
  if (days.length === 0) return null
  return days.reduce((sum, day) => sum + day, 0) / days.length
}

export type SlipSummary = { key: string; label: string; count: number; average: number | null }

export function summarizeSlips(records: NetRecord[], field: 'rocket' | 'provider'): SlipSummary[] {
  const groups = new Map<string, number[]>()
  for (const record of records) {
    const label = record[field].trim()
    if (!label) continue
    const days = slipDays(record.points)
    if (days.length === 0) continue
    groups.set(label, [...(groups.get(label) ?? []), ...days])
  }
  return [...groups.entries()]
    .map(([label, days]) => ({ key: label, label, count: days.length, average: averageDays(days) }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}
