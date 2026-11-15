import { GLOSSARY } from '@/lib/glossary'
import { HISTORY } from '@/lib/history'
import { ROCKET_CATALOG } from '@/lib/rocket-catalog'
import type { Launch } from '@/lib/types'

export type SearchHit = {
  kind: 'rocket' | 'launch' | 'pad' | 'company' | 'term' | 'history' | 'event'
  title: string
  href: string
  detail: string
}

export function searchAll(query: string, launches: Launch[]): SearchHit[] {
  const text = query.trim().toLowerCase()
  if (text.length < 2) return []
  const hits: SearchHit[] = []
  for (const rocket of ROCKET_CATALOG) {
    if (rocket.name.toLowerCase().includes(text) || rocket.matches.some((match) => match.includes(text) || text.includes(match))) {
      hits.push({ kind: 'rocket', title: rocket.name, href: `/rockets/${rocket.id}`, detail: rocket.summary })
    }
  }
  for (const launch of launches) {
    const blob = `${launch.name} ${launch.rocketName} ${launch.padName} ${launch.provider.name}`.toLowerCase()
    if (blob.includes(text)) {
      hits.push({ kind: 'launch', title: launch.name, href: `/launches/${launch.id}`, detail: launch.rocketName })
    }
    if (launch.padName.toLowerCase().includes(text)) {
      hits.push({ kind: 'pad', title: launch.padName, href: `/launches/${launch.id}`, detail: launch.padLocation ?? launch.provider.name })
    }
    if (launch.provider.companyId && launch.provider.name.toLowerCase().includes(text)) {
      hits.push({ kind: 'company', title: launch.provider.name, href: `/companies/${launch.provider.companyId}`, detail: 'On the board' })
      hits.push({ kind: 'company', title: `${launch.provider.name} timeline`, href: `/pro/company/${launch.provider.companyId}`, detail: 'Pro' })
    }
  }
  for (const term of GLOSSARY) {
    if (term.term.toLowerCase().includes(text) || (term.expands ?? '').toLowerCase().includes(text)) {
      hits.push({ kind: 'term', title: term.term, href: `/glossary#${term.id}`, detail: term.kid })
    }
  }
  if (text.includes('starbase') || text.includes('boca')) {
    hits.push({ kind: 'pad', title: 'Starbase', href: '/launches?site=starbase', detail: 'SpaceX Starbase, Texas' })
  }
  for (const mission of HISTORY) {
    if (`${mission.name} ${mission.rocket}`.toLowerCase().includes(text)) {
      hits.push({ kind: 'history', title: mission.name, href: `/history#${mission.id}`, detail: mission.when })
    }
  }
  const seen = new Set<string>()
  return hits.filter((hit) => {
    const key = `${hit.kind}:${hit.href}:${hit.title}`
    if (seen.has(key) || !hit.href || hit.href.endsWith('/')) return false
    seen.add(key)
    return true
  }).slice(0, 12)
}
