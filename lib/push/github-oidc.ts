import { createPublicKey, verify } from 'node:crypto'

export const GITHUB_OIDC_ISS = 'https://token.actions.githubusercontent.com'
export const GITHUB_OIDC_AUD = 'https://liftoffclub.app'
export const GITHUB_OIDC_REPO = 'Partiqule/Liftoff-Club'
export const GITHUB_OIDC_REF = 'refs/heads/main'
const JWKS_URL = 'https://token.actions.githubusercontent.com/.well-known/jwks'

type Jwk = JsonWebKey & { kid?: string }
let cached: { expires: number; keys: Jwk[] } | null = null

export function oidcClaimsAllow(payload: Record<string, unknown>, now = Date.now()): boolean {
  if (payload.iss !== GITHUB_OIDC_ISS) return false
  const aud = payload.aud
  const audiences = Array.isArray(aud) ? aud : [aud]
  if (!audiences.includes(GITHUB_OIDC_AUD)) return false
  if (payload.repository !== GITHUB_OIDC_REPO) return false
  if (payload.ref !== GITHUB_OIDC_REF) return false
  if (typeof payload.exp !== 'number' || payload.exp * 1000 <= now) return false
  if (typeof payload.nbf === 'number' && payload.nbf * 1000 > now) return false
  return true
}

export function verifyOidcSignature(token: string, jwk: Jwk): boolean {
  const parts = token.split('.')
  if (parts.length !== 3) return false
  try {
    const key = createPublicKey({ key: jwk, format: 'jwk' })
    const data = Buffer.from(`${parts[0]}.${parts[1]}`)
    const signature = Buffer.from(parts[2], 'base64url')
    return verify('RSA-SHA256', data, key, signature)
  } catch {
    return false
  }
}

export function readOidcPayload(token: string): { header: { alg?: string; kid?: string }; payload: Record<string, unknown> } | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString()) as { alg?: string; kid?: string }
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as Record<string, unknown>
    if (header.alg !== 'RS256' || !header.kid) return null
    return { header, payload }
  } catch {
    return null
  }
}

async function keysForKid(kid: string): Promise<Jwk | null> {
  if (!cached || cached.expires < Date.now()) {
    const response = await fetch(JWKS_URL, { cache: 'no-store' })
    if (!response.ok) return null
    const body = (await response.json()) as { keys?: Jwk[] }
    cached = { expires: Date.now() + 10 * 60 * 1000, keys: body.keys ?? [] }
  }
  return cached.keys.find((key) => key.kid === kid) ?? null
}

export async function githubOidcAllows(token: string, now = Date.now()): Promise<boolean> {
  const parsed = readOidcPayload(token)
  if (!parsed) return false
  const jwk = await keysForKid(parsed.header.kid ?? '')
  if (!jwk || !verifyOidcSignature(token, jwk)) return false
  return oidcClaimsAllow(parsed.payload, now)
}

export function bearerToken(header: string | null): string {
  if (!header?.startsWith('Bearer ')) return ''
  return header.slice('Bearer '.length).trim()
}
