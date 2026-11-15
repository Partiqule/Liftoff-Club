export type PublicFiling = {
  id: string
  filer: string
  type: string
  date: string
  proceeding: string
  title: string
  url: string
}

const SATELLITE = /satellite|space station|\bngso\b|\bgso\b|earth station/i

export function isSatelliteFiling(text: string): boolean {
  return SATELLITE.test(text)
}

export function normalizeFiling(value: unknown): PublicFiling | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Record<string, unknown>
  const id = text(item.id_submission)
  if (!id) return null
  const filers = Array.isArray(item.filers) ? item.filers : []
  const filer = text((filers[0] as Record<string, unknown> | undefined)?.name) ?? 'Filer not listed'
  const type = text((item.submissiontype as Record<string, unknown> | undefined)?.description) ?? 'Filing'
  const proceedings = Array.isArray(item.proceedings) ? item.proceedings : []
  const proceeding = proceedings[0] as Record<string, unknown> | undefined
  const proceedingName = text(proceeding?.name) ?? ''
  const proceedingTitle = text(proceeding?.description) ?? ''
  const documents = Array.isArray(item.documents) ? item.documents : []
  const doc = documents[0] as Record<string, unknown> | undefined
  const docUrl = text(doc?.src)
  const blob = `${filer} ${type} ${proceedingName} ${proceedingTitle} ${text(doc?.filename) ?? ''}`
  if (!isSatelliteFiling(blob)) return null
  const when = text(item.date_disseminated) ?? text(item.date_received) ?? ''
  return {
    id,
    filer,
    type,
    date: when.slice(0, 10),
    proceeding: proceedingName,
    title: proceedingTitle || text(doc?.filename) || type,
    url: docUrl && docUrl.startsWith('https://') ? docUrl : `https://www.fcc.gov/ecfs/search/search-filings/filing/${id}`,
  }
}

export function filterFilings(rows: PublicFiling[], query: { company?: string; type?: string }): PublicFiling[] {
  const company = query.company?.trim().toLowerCase() ?? ''
  const type = query.type?.trim().toLowerCase() ?? ''
  return rows.filter((row) => {
    if (company && !row.filer.toLowerCase().includes(company)) return false
    if (type && row.type.toLowerCase() !== type) return false
    return true
  })
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
