import { sendNotification, setVapidDetails } from 'web-push'
import { readPushEnv } from '@/lib/push/config'
import type { PushNotice } from '@/lib/push/plan'
import type { StoredPush } from '@/lib/push/record'

let ready = false

function ensure(): boolean {
  const env = readPushEnv()
  if (!env) return false
  if (!ready) {
    setVapidDetails(env.subject, env.publicKey, env.privateKey)
    ready = true
  }
  return true
}

export async function sendNotice(record: StoredPush, notice: PushNotice): Promise<'sent' | 'gone' | 'skipped'> {
  if (!ensure()) return 'skipped'
  try {
    await sendNotification(
      { endpoint: record.endpoint, keys: { p256dh: record.p256dh, auth: record.auth } },
      JSON.stringify({ title: notice.title, body: notice.body, url: notice.url, tag: notice.tag }),
      { TTL: 60 * 60 },
    )
    return 'sent'
  } catch (error) {
    const status = typeof error === 'object' && error && 'statusCode' in error ? Number(error.statusCode) : 0
    if (status === 404 || status === 410) return 'gone'
    return 'skipped'
  }
}
