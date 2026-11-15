import { isQuietHour } from '@/lib/quiet'
import type { AlertCandidate, LaunchBrief, Settings, SkyPass } from '@/lib/types'
import { seeLaunch } from '@/lib/visibility'
import { skyAt, type WeatherBundle } from '@/lib/weather'

export function dueAlerts(input: {
  now: number
  settings: Settings
  briefs: LaunchBrief[]
  passes: SkyPass[]
  already: Set<string>
  weather?: WeatherBundle | null
}): AlertCandidate[] {
  const notes = input.settings.notifications
  if (!notes.enabled) return []
  const zone = input.settings.location?.timezone
  if (isQuietHour(new Date(input.now), input.settings.quietStart, input.settings.quietEnd, zone)) return []
  const lead = notes.leadMinutes * 60 * 1000
  const alerts: AlertCandidate[] = []

  for (const launch of input.briefs) {
    if (!launch.net) continue
    const when = Date.parse(launch.net)
    if (!Number.isFinite(when)) continue
    const delta = when - input.now
    if (delta < 0 || delta > lead) continue
    const id = `launch:${launch.id}`
    if (input.already.has(id)) continue
    if (!providerAllowed(launch.providerName, notes)) continue
    const verdict = input.settings.location
      ? seeLaunch(
          {
            name: launch.name,
            rocketName: launch.rocketName,
            provider: { name: launch.providerName, abbrev: null, description: null, country: null, siteUrl: null, type: null, companyId: null },
            padLat: launch.padLat,
            padLon: launch.padLon,
            padName: launch.padName,
            precision: launch.precision,
            net: launch.net,
            windowEnd: launch.windowEnd,
          },
          input.settings.location,
          new Date(when),
        )
      : null
    const visible = verdict?.grade === 'likely' || verdict?.grade === 'maybe'
    if (notes.visibleOnly && input.settings.location && !visible) continue
    const rules = notes.rules ?? { starship: false, visibleFromHere: false, hourWithWeather: false }
    const rulesOn = rules.starship || rules.visibleFromHere || rules.hourWithWeather
    const matched: string[] = []
    if (rules.starship && /starship/i.test(`${launch.name} ${launch.rocketName}`)) matched.push('Starship')
    if (rules.visibleFromHere && visible) matched.push('visible from here')
    if (rules.hourWithWeather && delta <= 60 * 60 * 1000) matched.push('inside an hour')
    if (rulesOn && matched.length === 0) continue
    const weatherLine =
      rules.hourWithWeather && input.weather && launch.net ? skyAt(input.weather, launch.net) : null
    const body = [
      matched.length ? `Rule: ${matched.join(', ')}.` : 'A launch on your list is inside the reminder window.',
      weatherLine ? weatherLine.label : null,
    ]
      .filter(Boolean)
      .join(' ')
    alerts.push({
      id,
      title: `Soon: ${launch.name}`,
      body,
      url: `/launches/${launch.id}/day`,
      when,
    })
  }

  if (notes.includeSky) {
    for (const pass of input.passes) {
      const when = Date.parse(pass.start)
      const delta = when - input.now
      if (delta < 0 || delta > lead) continue
      const id = `pass:${pass.id}`
      if (input.already.has(id)) continue
      if (pass.grade === 'poor') continue
      if (notes.visibleOnly && pass.grade === 'fair' && pass.kind === 'starlink') continue
      alerts.push({
        id,
        title: pass.kind === 'iss' ? 'The space station is about to pass' : `${pass.name} passes soon`,
        body: pass.gradeReason,
        url: '/sky',
        when,
      })
    }
  }

  return alerts
}

function providerAllowed(name: string, notes: Settings['notifications']): boolean {
  if (notes.providerMode === 'all') return true
  if (notes.providerMode === 'spacex') return /spacex/i.test(name)
  if (notes.providers.length === 0) return true
  return notes.providers.some((provider) => provider.toLowerCase() === name.toLowerCase())
}
