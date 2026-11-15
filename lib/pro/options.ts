import { companySlug, listCatalog } from '@/lib/companies'
import { companiesOnBoard } from '@/lib/company-board'
import { CONSTELLATIONS } from '@/lib/constellation-data'
import type { Launch } from '@/lib/types'
import type { ConstellationRef, WatchKind } from '@/lib/pro/watch'

export type DeskOption = {
  kind: WatchKind
  id: string
  label: string
}

export function constellationRefs(): ConstellationRef[] {
  return CONSTELLATIONS.map((item) => ({ id: item.id, name: item.name, pattern: item.launchPattern }))
}

export function watchChoices(launches: Launch[]): DeskOption[] {
  const companies = new Map<string, string>()
  for (const company of listCatalog()) companies.set(company.slug, company.name)
  for (const company of companiesOnBoard(launches)) companies.set(company.slug, company.name)
  const choices: DeskOption[] = []
  for (const [id, label] of companies) choices.push({ kind: 'company', id, label })
  for (const item of CONSTELLATIONS) choices.push({ kind: 'constellation', id: item.id, label: item.name })
  const rockets = new Set(launches.map((launch) => launch.rocketName))
  const sites = new Set(launches.map((launch) => launch.padLocation ?? launch.padName).filter(Boolean))
  for (const name of rockets) choices.push({ kind: 'rocket', id: companySlug(name), label: name })
  for (const name of sites) choices.push({ kind: 'site', id: companySlug(name), label: name })
  return choices.sort((a, b) => a.kind.localeCompare(b.kind) || a.label.localeCompare(b.label))
}

export function boardDay(iso: string | null | undefined): string | null {
  const day = iso?.slice(0, 10) ?? ''
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null
}
