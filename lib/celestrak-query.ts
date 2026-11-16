export const CELESTRAK_FRESH_MS = 24 * 60 * 60 * 1000

export const ISS_GP_URL = 'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=JSON'

export function starlinkLaunchUrl(designator: string): string | null {
  const match = designator.trim().toUpperCase().match(/^(\d{4})-(\d{1,4})/)
  if (!match) return null
  const piece = `${match[1]}-${match[2].padStart(3, '0').slice(-3)}`
  return `https://celestrak.org/NORAD/elements/gp.php?INTDES=${piece}&FORMAT=JSON`
}

export function catalogCsvUrl(group: string): string {
  return `https://celestrak.org/satcat/records.php?GROUP=${encodeURIComponent(group)}&FORMAT=CSV`
}

/** Named SATCAT groups, including Starlink. Sky passes still avoid the full Starlink element file. */
export function catalogGroupAllowed(group: string): boolean {
  return group.trim().length > 0
}

/** Any answer other than 200 stops further CelesTrak calls, except a missing launch set. */
export function celestrakShouldHalt(status: number): boolean {
  return status !== 200 && status !== 404
}
