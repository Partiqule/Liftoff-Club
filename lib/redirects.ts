/** Old public paths that should land on the page that replaced them. */
export const LEGACY_REDIRECTS = [
  { source: '/tonight', destination: '/', permanent: true },
  { source: '/parents', destination: '/settings', permanent: true },
  { source: '/for-parents', destination: '/settings', permanent: true },
  { source: '/calendar', destination: '/launches', permanent: true },
] as const
