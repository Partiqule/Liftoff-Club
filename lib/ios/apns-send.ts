import 'server-only'

import { apnsJwt, apnsPayload, readApnsEnv } from '@/lib/ios/apns'
import { removeApns, replaceApns, listApns } from '@/lib/ios/apns-store'
import { applyNotices, planNotices, type LaunchSnap } from '@/lib/push/plan'
import { isQuietHour } from '@/lib/quiet'

export async function deliverApns(launches: LaunchSnap[], now = new Date()): Promise<{ sent: number; removed: number }> {
  const config = readApnsEnv()
  if (!config) return { sent: 0, removed: 0 }
  const token = apnsJwt(config, now.getTime())
  const devices = await listApns().catch(() => [])
  let sent = 0
  let removed = 0
  for (const device of devices) {
    const notices = planNotices(now.getTime(), device, launches.filter((launch) => device.launchIds.includes(launch.id)))
    let gone = false
    for (const notice of notices) {
      const result = await postApns(config.host, config.bundleId, token, device.token, apnsPayload(notice))
      if (result === 'gone') {
        gone = true
        break
      }
      if (result === 'sent') sent += 1
    }
    if (gone) {
      await removeApns(device.id)
      removed += 1
      continue
    }
    const quiet = isQuietHour(now, device.quietStart, device.quietEnd, device.timezone)
    if (!device.paused && !quiet) await replaceApns({ ...device, ...applyNotices(device, notices, launches) })
  }
  return { sent, removed }
}

async function postApns(host: string, topic: string, jwt: string, device: string, body: string): Promise<'sent' | 'gone' | 'skipped'> {
  try {
    const response = await fetch(`${host}/3/device/${device}`, {
      method: 'POST',
      headers: {
        authorization: `bearer ${jwt}`,
        'apns-topic': topic,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'content-type': 'application/json',
      },
      body,
    })
    if (response.status === 410 || response.status === 400) return 'gone'
    if (!response.ok) return 'skipped'
    return 'sent'
  } catch {
    return 'skipped'
  }
}
