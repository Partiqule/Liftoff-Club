export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (configured) return trim(configured)
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  if (production) return `https://${trim(production)}`
  const preview = process.env.VERCEL_URL?.trim()
  if (preview) return `https://${trim(preview)}`
  return 'http://localhost:3000'
}

function trim(value: string): string {
  return value.replace(/\/$/, '')
}

export function isLocalSite(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(url)
}
