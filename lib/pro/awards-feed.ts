import 'server-only'

export type CompanyAward = {
  id: string
  recipient: string
  amount: string
  date: string
  agency: string
  url: string
}

export async function awardsForCompany(name: string): Promise<CompanyAward[]> {
  const end = new Date().toISOString().slice(0, 10)
  const start = new Date(Date.now() - 730 * 86_400_000).toISOString().slice(0, 10)
  try {
    const response = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': 'LiftoffClub/1.0' },
      body: JSON.stringify({
        filters: {
          award_type_codes: ['A', 'B', 'C', 'D'],
          recipient_search_text: [name],
          time_period: [{ start_date: start, end_date: end }],
        },
        fields: ['Award ID', 'Recipient Name', 'Award Amount', 'Start Date', 'Awarding Agency', 'generated_internal_id'],
        limit: 6,
        page: 1,
        sort: 'Start Date',
        order: 'desc',
      }),
      signal: AbortSignal.timeout(20_000),
      cache: 'no-store',
    })
    if (!response.ok) return []
    const payload = (await response.json()) as { results?: Record<string, unknown>[] }
    return (payload.results ?? [])
      .map((row) => {
        const id = text(row['Award ID'])
        const recipient = text(row['Recipient Name'])
        if (!id || !recipient) return null
        const amount = typeof row['Award Amount'] === 'number' ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(row['Award Amount']) : 'No public figure yet'
        const internal = text(row.generated_internal_id)
        return {
          id,
          recipient,
          amount,
          date: text(row['Start Date']) ?? '',
          agency: text(row['Awarding Agency']) ?? 'Agency not listed',
          url: internal ? `https://www.usaspending.gov/award/${internal}` : 'https://www.usaspending.gov/',
        }
      })
      .filter((row): row is CompanyAward => Boolean(row))
  } catch {
    return []
  }
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
