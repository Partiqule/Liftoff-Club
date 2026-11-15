const PAGE_SIZE = 100

/** Every upcoming launch. No status, provider, orbit, or pad allowlist. */
export function upcomingPageUrl(offset: number): string {
  const params = new URLSearchParams({
    mode: 'normal',
    limit: String(PAGE_SIZE),
    hide_recent_previous: 'false',
    offset: String(offset),
  })
  return `https://ll.thespacedevs.com/2.3.0/launches/upcoming/?${params}`
}

export const LAUNCH_PAGE_SIZE = PAGE_SIZE
