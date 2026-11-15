import { formatMountain } from '@/lib/pro/time'
import type { Launch } from '@/lib/types'

const RIDESHARE = /\btransporter\b|\bbandwagon\b|\brideshare\b/i

export type ManifestFilters = {
  company: string
  rideshare: boolean
  orbit: string
  site: string
}

export function isRideshareLaunch(launch: Pick<Launch, 'name' | 'missionName' | 'missionType'>): boolean {
  return RIDESHARE.test(`${launch.name} ${launch.missionName ?? ''} ${launch.missionType ?? ''}`)
}

export function filterManifest(launches: Launch[], filters: ManifestFilters): Launch[] {
  const company = filters.company.trim().toLowerCase()
  return launches.filter((launch) => {
    if (filters.rideshare && !isRideshareLaunch(launch)) return false
    if (filters.orbit && (launch.orbitAbbrev ?? launch.orbitName ?? '') !== filters.orbit) return false
    if (filters.site && (launch.padLocation ?? launch.padName) !== filters.site) return false
    if (!company) return true
    const haystack = [
      launch.name,
      launch.provider.name,
      ...launch.manifest.flatMap((item) => [item.company, item.name]),
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(company)
  })
}

export function manifestCsv(launches: Launch[]): string {
  const header = ['Launch', 'When MT', 'Provider', 'Rocket', 'Orbit', 'Site', 'Status', 'Companies', 'Payloads']
  const lines = [header, ...launches.map(csvRow)]
  return lines.map((row) => row.map(csvCell).join(',')).join('\n') + '\n'
}

function csvRow(launch: Launch): string[] {
  const companies = unique(launch.manifest.map((item) => item.company)).join('; ')
  const payloads = launch.manifest
    .filter((item) => item.role === 'payload' || item.role === 'spacecraft')
    .map((item) => (item.count && item.count > 1 ? `${item.count} ${item.name}` : item.name))
    .join('; ')
  return [
    launch.name,
    launch.net ? formatMountain(launch.net) : '',
    launch.provider.name,
    launch.rocketName,
    launch.orbitName ?? launch.orbitAbbrev ?? '',
    launch.padLocation ?? launch.padName,
    launch.statusName,
    companies,
    payloads,
  ]
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

function csvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value
  if (/[",\n]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`
  return safe
}
