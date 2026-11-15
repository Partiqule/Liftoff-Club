import { firstSentences, resolveCompany, type CompanyRecord } from '@/lib/companies'
import type { Launch, ManifestItem } from '@/lib/types'

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item'
}

function sentencesFor(name: string, description: string | null, siteUrl?: string | null): CompanyRecord {
  return resolveCompany(name, { description, siteUrl })
}

function starlinkCount(launch: Pick<Launch, 'name' | 'missionDescription'>): number | null {
  const text = `${launch.name} ${launch.missionDescription ?? ''}`
  const batch = text.match(/batch of (\d+)/i)
  if (batch) return Number(batch[1])
  const sats = text.match(/(\d+)\s+satellites/i)
  return sats ? Number(sats[1]) : null
}

export function buildManifest(launch: Omit<Launch, 'manifest'>): ManifestItem[] {
  const items: ManifestItem[] = []
  const providerCopy = sentencesFor(launch.provider.name, launch.provider.description, launch.provider.siteUrl)
  items.push({
    id: slug(`provider-${providerCopy.id}`),
    name: launch.provider.name,
    company: providerCopy.name,
    companyId: providerCopy.id,
    companySlug: providerCopy.slug,
    role: 'provider',
    kind: 'Launch provider',
    count: null,
    brief: providerCopy.brief,
    kidBrief: providerCopy.kid,
    careersUrl: providerCopy.careersUrl,
    siteUrl: providerCopy.siteUrl,
  })

  if (launch.spacecraftName) {
    const company = launch.provider.name
    const copy = sentencesFor(company, null, launch.provider.siteUrl)
    items.push({
      id: slug(`ship-${launch.spacecraftName}`),
      name: launch.spacecraftName,
      company: copy.name,
      companyId: copy.id,
      companySlug: copy.slug,
      role: 'spacecraft',
      kind: launch.spacecraftDestination ? `Spacecraft · ${launch.spacecraftDestination}` : 'Spacecraft',
      count: 1,
      brief: launch.spacecraftDestination
        ? `${launch.spacecraftName} is the ship on this flight. Destination: ${launch.spacecraftDestination}.`
        : `${launch.spacecraftName} is the ship on this flight.`,
      kidBrief: launch.spacecraftDestination
        ? `The ship is ${launch.spacecraftName}. It is headed for ${launch.spacecraftDestination}.`
        : `The ship riding the rocket is called ${launch.spacecraftName}.`,
      careersUrl: copy.careersUrl,
      siteUrl: copy.siteUrl,
    })
  }

  const starlink = /starlink/i.test(`${launch.name} ${launch.missionName ?? ''}`)
  if (starlink) {
    const copy = sentencesFor('Starlink', launch.missionDescription)
    items.push({
      id: 'payload-starlink',
      name: 'Starlink satellites',
      company: copy.name,
      companyId: copy.id,
      companySlug: copy.slug,
      role: 'payload',
      kind: 'Communications satellites',
      count: starlinkCount(launch),
      brief: copy.brief,
      kidBrief: copy.kid,
      careersUrl: copy.careersUrl,
      siteUrl: copy.siteUrl,
    })
  }

  for (const hint of launch.payloadHints) {
    if (starlink && /starlink/i.test(hint.name)) continue
    const companyName = hint.company ?? hint.name
    const copy = sentencesFor(companyName, hint.companyDescription ?? hint.description, hint.siteUrl)
    items.push({
      id: slug(`payload-${hint.name}-${copy.id}`),
      name: hint.name,
      company: copy.name,
      companyId: copy.id,
      companySlug: copy.slug,
      role: 'payload',
      kind: hint.kind,
      count: hint.count,
      brief: hint.description ? firstSentences(hint.description, 2, 280) : copy.brief,
      kidBrief: copy.kid,
      careersUrl: copy.careersUrl,
      siteUrl: hint.siteUrl ?? copy.siteUrl,
    })
  }

  for (const customer of launch.customers) {
    const already = items.some((item) => item.company.toLowerCase() === customer.name.toLowerCase())
    if (already) continue
    const copy = sentencesFor(customer.name, customer.description, customer.siteUrl)
    items.push({
      id: slug(`customer-${copy.id}`),
      name: customer.name,
      company: copy.name,
      companyId: copy.id,
      companySlug: copy.slug,
      role: 'customer',
      kind: customer.type,
      count: null,
      brief: copy.brief,
      kidBrief: copy.kid,
      careersUrl: copy.careersUrl,
      siteUrl: customer.siteUrl ?? copy.siteUrl,
    })
  }

  return collapse(items).slice(0, 14)
}

function collapse(items: ManifestItem[]): ManifestItem[] {
  const map = new Map<string, ManifestItem>()
  for (const item of items) {
    const key = `${item.role}|${item.companyId}|${item.name.toLowerCase()}`
    const previous = map.get(key)
    if (!previous) {
      map.set(key, { ...item })
      continue
    }
    if (item.count && previous.count) previous.count += item.count
    else if (item.count && !previous.count) previous.count = item.count
  }
  return [...map.values()]
}

export function roleLabel(role: ManifestItem['role']): { kid: string; adult: string } {
  switch (role) {
    case 'provider':
      return { kid: 'Who is flying it', adult: 'Launch provider' }
    case 'spacecraft':
      return { kid: 'The ship', adult: 'Spacecraft' }
    case 'customer':
      return { kid: 'Who it is for', adult: 'Customer' }
    default:
      return { kid: 'On board', adult: 'Payload' }
  }
}
