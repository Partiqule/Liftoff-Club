export type AccessDesk = 'company' | 'sales'

export type SignupInput = {
  name: string
  email: string
  company: string
  role: string
  desk: AccessDesk
}

export type SignupRecord = SignupInput & { createdAt: string }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function signupsConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(pick(env, ['UPSTASH_REDIS_REST_URL', 'KV_REST_API_URL']) && pick(env, ['UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_TOKEN']))
}

export function notifyConfigured(env: Record<string, string | undefined> = process.env): { key: string; to: string; from: string } | null {
  const key = pick(env, ['RESEND_API_KEY'])
  const to = pick(env, ['PRO_NOTIFY_EMAIL'])
  if (!key || !to || !EMAIL.test(to)) return null
  const from = pick(env, ['RESEND_FROM']) || 'Liftoff Club <notifications@liftoffclub.app>'
  return { key, to, from }
}

export function validateSignup(body: unknown, honeypot: unknown): { ok: true; value: SignupInput } | { ok: false; error: string } | { ok: true; ignored: true } {
  if (typeof honeypot === 'string' && honeypot.trim()) return { ok: true, ignored: true }
  if (!body || typeof body !== 'object') return { ok: false, error: 'The form was empty.' }
  const raw = body as Record<string, unknown>
  const name = clean(raw.name, 80)
  const email = clean(raw.email, 120).toLowerCase()
  const company = clean(raw.company, 120)
  const role = clean(raw.role, 80)
  const desk = raw.desk === 'sales' ? 'sales' : raw.desk === 'company' ? 'company' : null
  if (!name || !email || !company || !role || !desk) return { ok: false, error: 'Name, work email, company, role, and desk are required.' }
  if (!EMAIL.test(email)) return { ok: false, error: 'That email does not look usable.' }
  return { ok: true, value: { name, email, company, role, desk } }
}

export function signupCsv(rows: SignupRecord[]): string {
  const header = ['createdAt', 'name', 'email', 'company', 'role', 'desk']
  const lines = [header.join(',')]
  for (const row of rows) {
    lines.push([row.createdAt, row.name, row.email, row.company, row.role, row.desk === 'sales' ? 'Sales desk' : 'Company desk'].map(csvCell).join(','))
  }
  return lines.join('\n')
}

export function signupNote(row: SignupRecord): string {
  const desk = row.desk === 'sales' ? 'Sales desk' : 'Company desk'
  return [`Liftoff Club Pro early access`, `Name: ${row.name}`, `Email: ${row.email}`, `Company: ${row.company}`, `Role: ${row.role}`, `Desk: ${desk}`, `Received: ${row.createdAt}`].join('\n')
}

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : ''
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

function pick(env: Record<string, string | undefined>, names: string[]): string {
  for (const name of names) {
    const value = env[name]?.trim()
    if (value) return value
  }
  return ''
}

async function command<T>(args: (string | number)[]): Promise<T | null> {
  const url = pick(process.env, ['UPSTASH_REDIS_REST_URL', 'KV_REST_API_URL'])
  const token = pick(process.env, ['UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_TOKEN'])
  if (!url || !token) return null
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Store answered ${response.status}`)
  const payload = (await response.json()) as { result?: T }
  return payload.result ?? null
}

export async function rememberSignup(row: SignupRecord, ip: string): Promise<'stored' | 'limited' | 'unconfigured'> {
  if (!signupsConfigured()) return 'unconfigured'
  const key = `pro:rate:${ip.slice(0, 80)}`
  const count = await command<number>(['INCR', key])
  if (count === 1) await command(['EXPIRE', key, 3600])
  if ((count ?? 0) > 5) return 'limited'
  await command(['LPUSH', 'pro:signups', JSON.stringify(row)])
  return 'stored'
}

export async function listSignups(): Promise<SignupRecord[]> {
  const raw = (await command<string[]>(['LRANGE', 'pro:signups', 0, 2000])) ?? []
  const rows: SignupRecord[] = []
  for (const item of raw) {
    try {
      const parsed = JSON.parse(item) as SignupRecord
      if (parsed.email && parsed.name) rows.push(parsed)
    } catch {
      // Skip a damaged row.
    }
  }
  return rows
}

export async function notifySignup(row: SignupRecord): Promise<boolean> {
  const notify = notifyConfigured()
  if (!notify) return false
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${notify.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: notify.from,
        to: [notify.to],
        subject: 'Liftoff Club Pro early access',
        text: signupNote(row),
      }),
    })
    return response.ok
  } catch {
    return false
  }
}
