export type PushEnv = {
  publicKey: string
  privateKey: string
  subject: string
  redisUrl: string
  redisToken: string
}

function pick(env: Record<string, string | undefined>, names: string[]): string {
  for (const name of names) {
    const value = env[name]?.trim()
    if (value) return value
  }
  return ''
}

export function readPushEnv(env: Record<string, string | undefined> = process.env): PushEnv | null {
  const publicKey = pick(env, ['VAPID_PUBLIC_KEY', 'NEXT_PUBLIC_VAPID_PUBLIC_KEY'])
  const privateKey = pick(env, ['VAPID_PRIVATE_KEY'])
  const subject = pick(env, ['VAPID_SUBJECT'])
  const redisUrl = pick(env, ['UPSTASH_REDIS_REST_URL', 'KV_REST_API_URL'])
  const redisToken = pick(env, ['UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_TOKEN'])
  if (!publicKey || !privateKey || !subject || !redisUrl || !redisToken) return null
  if (!/^mailto:|^https:\/\//i.test(subject)) return null
  return { publicKey, privateKey, subject, redisUrl, redisToken }
}

export function pushConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return readPushEnv(env) !== null
}

export function cronAuthorized(header: string | null, env: Record<string, string | undefined> = process.env): boolean {
  const secret = (env.CRON_SECRET ?? '').trim()
  if (!secret) return false
  return header === `Bearer ${secret}`
}
