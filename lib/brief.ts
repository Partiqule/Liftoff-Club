import type { SkyPass } from '@/lib/types'

export type BriefSource = {
  id: string
  name: string
  net: string | null
  windowEnd?: string | null
  providerName: string
  rocketName: string
  padName: string
  padLocation: string | null
  statusAbbrev?: string
  statusName?: string
  historical?: boolean
}

export type BriefPeriod = 'day' | 'week'

export type BriefLaunch = {
  id: string
  name: string
  net: string | null
  line: string
}

export type BriefMessage = {
  period: BriefPeriod
  subject: string
  text: string
  launches: BriefLaunch[]
  sky: string
}

/** A flown launch is not upcoming, even if the net was only a few minutes ago or the old name is still in memory. */
function stillUpcoming(launch: BriefSource, now: number): boolean {
  if (launch.historical) return false
  const status = `${launch.statusAbbrev ?? ''} ${launch.statusName ?? ''}`.toLowerCase()
  if (status.includes('fail') || status.includes('success')) return false
  if (!launch.net) return false
  const when = Date.parse(launch.net)
  return Number.isFinite(when) && when > now
}

/**
 * A later email or text sender can deliver this same message.
 * Version 1 only shows it on the screen.
 */
export type BriefSender = {
  channel: 'screen' | 'email' | 'text'
  send(message: BriefMessage): Promise<void>
}

export function buildBrief(input: {
  period: BriefPeriod
  now: number
  launches: BriefSource[]
  passes: SkyPass[]
  placeLabel: string | null
}): BriefMessage {
  const horizon = input.now + (input.period === 'day' ? 1 : 7) * 86_400_000
  const launches = input.launches
    .filter((launch) => stillUpcoming(launch, input.now))
    .filter((launch) => {
      const when = Date.parse(launch.net ?? '')
      return Number.isFinite(when) && when <= horizon
    })
    .slice(0, input.period === 'day' ? 8 : 20)
    .map((launch) => ({
      id: launch.id,
      name: launch.name,
      net: launch.net,
      line: `${launch.providerName} · ${launch.rocketName} · ${launch.padLocation ?? launch.padName}`,
    }))
  const visible = input.passes.filter((pass) => pass.grade === 'great' || pass.grade === 'good' || pass.grade === 'fair')
  const sky = !input.placeLabel
    ? 'Set your location to see which passes are overhead.'
    : visible.length
      ? `${visible.length} pass${visible.length === 1 ? '' : 'es'} worth a look from ${input.placeLabel}. First: ${visible[0]?.name ?? 'a satellite'}.`
      : `Nothing bright is listed over ${input.placeLabel} in the passes we have.`
  const subject = input.period === 'day' ? 'Liftoff Club daily brief' : 'Liftoff Club weekly brief'
  const launchLines = launches.length
    ? launches.map((launch) => `${launch.name}. ${launch.line}.`).join('\n')
    : 'No launch is listed in this window.'
  return {
    period: input.period,
    subject,
    sky,
    launches,
    text: `${subject}\n\n${sky}\n\n${launchLines}`,
  }
}
