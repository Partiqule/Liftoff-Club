import { describe, expect, it } from 'vitest'
import { companyPage } from '@/lib/company-board'
import { companySlug, listCatalog, resolveCompany } from '@/lib/companies'
import { makeLaunch } from './fixtures'

describe('company identities', () => {
  it('keeps one stable id across spellings and product names', () => {
    expect(resolveCompany('SpaceX').id).toBe('spacex')
    expect(resolveCompany('Starlink').id).toBe('spacex')
    expect(resolveCompany('ULA').id).toBe(resolveCompany('United Launch Alliance').id)
    expect(resolveCompany('U.S. Space Force').id).toBe('united-states-space-force')
    expect(companySlug('United Launch Alliance')).toBe('united-launch-alliance')
  })

  it('mints a slug for an unknown name and leaves the page unclaimed', () => {
    const minted = resolveCompany('Acme Orbitals')
    expect(minted.id).toBe('acme-orbitals')
    expect(minted.slug).toBe('acme-orbitals')
    expect(minted.cataloged).toBe(false)
    expect(minted.claimedBy).toBeNull()
    expect(minted.careersUrl).toBeNull()
  })

  it('does not mint two catalog ids for the same slug', () => {
    const ids = listCatalog().map((company) => company.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(listCatalog().every((company) => company.claimedBy === null && company.id === company.slug)).toBe(true)
  })

  it('builds a profile from launches that name the company', () => {
    const page = companyPage('spacex', [makeLaunch()])
    expect(page?.company.name).toBe('SpaceX')
    expect(page?.flights.length).toBeGreaterThan(0)
    expect(page?.flights[0]?.roles).toContain('provider')
  })
})
