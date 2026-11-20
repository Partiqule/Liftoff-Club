/** A real timestamp from the launch record or the board fetch. Never a frozen build clock. */
export function launchLastModified(lastUpdated: string | null | undefined, fetchedAt: string): Date {
  const updated = Date.parse(lastUpdated ?? '')
  if (Number.isFinite(updated)) return new Date(updated)
  const fetched = Date.parse(fetchedAt)
  if (Number.isFinite(fetched)) return new Date(fetched)
  return new Date(0)
}
