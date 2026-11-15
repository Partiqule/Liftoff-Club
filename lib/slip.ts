export type SlipLaunch = {
  id: string
  net: string | null
  statusName?: string | null
  statusAbbrev?: string
  failReason?: string | null
  holdReason?: string | null
  weatherConcerns?: string | null
  infoUrl?: string | null
  updates?: { text: string }[]
}

export type SlipPoint = {
  at: string
  net: string | null
  status: string
  reason: string | null
  sourceUrl: string | null
}

/** A reason only when Launch Library published one. */
export function publishedReason(launch: SlipLaunch): string | null {
  const direct = [launch.failReason, launch.holdReason, launch.weatherConcerns].find((item) => item && item.trim())
  if (direct) return direct.trim()
  const note = launch.updates?.map((item) => item.text.trim()).find((item) => item.length > 0)
  return note || null
}

export function slipSentence(input: {
  statusName: string
  previousStatus: string | null
  timeLabel: string
  timeChanged: boolean
  reason: string | null
}): string {
  const statusChanged = Boolean(input.previousStatus && input.previousStatus !== input.statusName)
  if (!statusChanged && !input.timeChanged) return ''
  const parts: string[] = []
  if (statusChanged) parts.push(`Status is now ${input.statusName}.`)
  if (input.timeChanged) parts.push(`New time: ${input.timeLabel}.`)
  parts.push(input.reason ? `Reason: ${input.reason}.` : 'No reason was published.')
  return parts.join(' ')
}

export function observeSlips(log: Record<string, SlipPoint[]>, launches: SlipLaunch[], nowIso: string): Record<string, SlipPoint[]> {
  const next: Record<string, SlipPoint[]> = { ...log }
  for (const launch of launches) {
    const status = `${launch.statusAbbrev ?? ''} ${launch.statusName ?? 'Unknown'}`.trim()
    const point: SlipPoint = {
      at: nowIso,
      net: launch.net,
      status,
      reason: publishedReason(launch),
      sourceUrl: launch.infoUrl ?? null,
    }
    const history = next[launch.id] ?? []
    const last = history[history.length - 1]
    if (!last) {
      next[launch.id] = [point]
      continue
    }
    if (last.net === launch.net && last.status === status && last.reason === point.reason) continue
    next[launch.id] = [...history, point].slice(-6)
  }
  return next
}

export function isScrubOrHold(statusName: string): boolean {
  return /\bscrub|\bhold\b|\bdelay|\bpostpon|\bfail/i.test(statusName)
}
