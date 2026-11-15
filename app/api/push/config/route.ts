import { pushConfigured, readPushEnv } from '@/lib/push/config'

export async function GET() {
  const env = readPushEnv()
  if (!env || !pushConfigured()) return Response.json({ enabled: false })
  return Response.json({ enabled: true, publicKey: env.publicKey })
}
