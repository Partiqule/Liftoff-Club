import { getCatalogCompany, type CompanyRecord } from '@/lib/companies'
import type { Launch } from '@/lib/types'

export type CompanyFlight = {
  launchId: string
  launchName: string
  net: string | null
  roles: string[]
}

export type CompanyPageData = {
  company: CompanyRecord
  flights: CompanyFlight[]
}

/**
 * Join the catalog to the launches already on the board.
 * This is the family-facing profile. A later business app can reuse the same
 * company id without a new naming scheme.
 */
export function companyPage(slug: string, launches: Launch[]): CompanyPageData | null {
  const catalog = getCatalogCompany(slug)
  const flights: CompanyFlight[] = []
  let boardCompany: CompanyRecord | null = null

  for (const launch of launches) {
    const roles = new Set<string>()
    for (const item of launch.manifest) {
      if (item.companySlug !== slug) continue
      roles.add(item.role)
      if (!boardCompany) {
        boardCompany = {
          id: item.companyId,
          slug: item.companySlug,
          name: item.company,
          brief: item.brief,
          kid: item.kidBrief,
          careersUrl: item.careersUrl,
          siteUrl: item.siteUrl,
          cataloged: Boolean(catalog),
          claimedBy: null,
        }
      }
    }
    if (roles.size > 0) {
      flights.push({
        launchId: launch.id,
        launchName: launch.name,
        net: launch.net,
        roles: [...roles],
      })
    }
  }

  const company = catalog ?? boardCompany
  if (!company) return null
  return { company, flights }
}

export function companiesOnBoard(launches: Launch[]): CompanyRecord[] {
  const map = new Map<string, CompanyRecord>()
  for (const launch of launches) {
    for (const item of launch.manifest) {
      if (!item.companySlug || map.has(item.companySlug)) continue
      const catalog = getCatalogCompany(item.companySlug)
      map.set(
        item.companySlug,
        catalog ?? {
          id: item.companyId,
          slug: item.companySlug,
          name: item.company,
          brief: item.brief,
          kid: item.kidBrief,
          careersUrl: item.careersUrl,
          siteUrl: item.siteUrl,
          cataloged: false,
          claimedBy: null,
        },
      )
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
}
