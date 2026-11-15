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

/** Magic links always open the live site, so the session cookie is set on liftoffclub.app. */
export function magicLinkOrigin(env: Record<string, string | undefined> = process.env): string {
  const configured = env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '') ?? ''
  if (configured && isLocalSite(configured)) return configured
  if (!env.VERCEL && !env.VERCEL_ENV && !env.VERCEL_URL) return configured || 'http://localhost:3000'
  return CANONICAL_ORIGIN
}

export function magicConfirmUrl(token: string, env: Record<string, string | undefined> = process.env): string {
  return `${magicLinkOrigin(env)}/api/pro/sign-in/confirm?token=${encodeURIComponent(token)}`
}
