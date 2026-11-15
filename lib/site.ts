export const CANONICAL_ORIGIN = 'https://liftoffclub.app'

export function siteUrl(env: Record<string, string | undefined> = process.env): string {
  const configured = env.NEXT_PUBLIC_SITE_URL?.trim()
  if (configured) return trim(configured)
  if (env.VERCEL_ENV === 'preview' && env.VERCEL_URL?.trim()) return `https://${trim(env.VERCEL_URL)}`
  if (env.VERCEL_ENV === 'production') return CANONICAL_ORIGIN
  return 'http://localhost:3000'
}

function trim(value: string): string {
  return value.replace(/\/$/, '')
}

export function isLocalSite(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(url)
}
