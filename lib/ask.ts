import type { Launch } from '@/lib/types'

export type LaunchAnswer = {
  answer: string
  source: 'listing' | 'model'
}

const cache = new Map<string, LaunchAnswer>()

export function questionKey(launchId: string, question: string): string {
  return `${launchId}:${question.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}`
}

/** Answers using only fields already on the launch. Never invents a fact. */
export function answerFromLaunch(launch: Launch, question: string): string {
  const asked = question.toLowerCase().replace(/\s+/g, ' ').trim()
  if (!asked) return 'Ask something about this launch.'
  const parts: string[] = []
  if (/when|time|clock|liftoff|net/.test(asked)) {
    parts.push(launch.net ? `The listed liftoff is ${launch.net}.` : 'No liftoff time is listed.')
    if (launch.precision) parts.push(`The clock precision is ${launch.precision}.`)
  }
  if (/where|pad|site|from/.test(asked)) {
    parts.push(`It flies from ${launch.padName}${launch.padLocation ? `, ${launch.padLocation}` : ''}.`)
  }
  if (/booster|serial|landing|reuse|reused/.test(asked)) {
    if (!launch.boosterSerial) parts.push('No booster serial is in the public listing.')
    else {
      const history = [
        launch.boosterFlights ? `this is flight ${launch.boosterFlights}` : null,
        launch.boosterCareerFlights ? `${launch.boosterCareerFlights} flights on record` : null,
        launch.boosterSuccessfulLandings != null ? `${launch.boosterSuccessfulLandings} successful landings` : null,
        launch.previousFlightName ? `previous flight ${launch.previousFlightName}` : null,
        launch.landingLocation ? `landing listed at ${launch.landingLocation}` : null,
      ].filter(Boolean)
      parts.push(`Booster ${launch.boosterSerial}${history.length ? `: ${history.join(', ')}` : ''}.`)
    }
  }
  if (/orbit|destination|going/.test(asked)) {
    parts.push(
      launch.orbitName || launch.spacecraftDestination
        ? `Orbit: ${launch.orbitName ?? 'not named'}. Destination: ${launch.spacecraftDestination ?? 'not named'}.`
        : 'No orbit or destination is listed.',
    )
  }
  if (/payload|customer|carrying|cargo|who/.test(asked)) {
    const names = launch.manifest.filter((item) => item.role !== 'provider').map((item) => item.company)
    parts.push(names.length ? `Named on the flight: ${[...new Set(names)].join(', ')}.` : 'No payload customer is named.')
  }
  if (/watch|webcast|stream|broadcast/.test(asked)) {
    const links = launch.webcasts?.length ? launch.webcasts : launch.webcastUrl ? [{ title: 'Webcast', url: launch.webcastUrl }] : []
    parts.push(links.length ? `Webcast: ${links.map((item) => item.url).join(' ')}` : 'No webcast link is listed.')
  }
  if (/scrub|delay|slip|hold|postpone/.test(asked)) {
    const notes = (launch.updates ?? []).map((item) => item.text)
    parts.push(notes.length ? notes.slice(0, 2).join(' ') : 'No scrub or delay note is in the listing.')
  }
  if (/status|go\b/.test(asked)) parts.push(`Status: ${launch.statusName}.`)
  if (parts.length === 0) return 'The public listing does not answer that. This page will not guess.'
  return parts.join(' ')
}

function listingFacts(launch: Launch): Record<string, unknown> {
  return {
    name: launch.name,
    provider: launch.provider.name,
    rocket: launch.rocketName,
    pad: launch.padName,
    location: launch.padLocation,
    net: launch.net,
    windowEnd: launch.windowEnd,
    precision: launch.precision,
    status: launch.statusName,
    orbit: launch.orbitName,
    destination: launch.spacecraftDestination,
    booster: launch.boosterSerial,
    boosterFlight: launch.boosterFlights,
    careerFlights: launch.boosterCareerFlights,
    landings: launch.boosterSuccessfulLandings,
    landingAttempts: launch.boosterAttemptedLandings,
    previousFlight: launch.previousFlightName,
    landing: launch.landingDescription,
    landingPlace: launch.landingLocation,
    customers: launch.manifest.map((item) => ({ role: item.role, name: item.company })),
    webcasts: launch.webcasts ?? [],
    updates: launch.updates ?? [],
    mission: launch.missionDescription,
  }
}

/**
 * Model answers only when EXPLAINER_API_KEY is set, and only from the launch record.
 * The result is cached by launch id and the exact question. Any failure uses the listing.
 */
export async function askAboutLaunch(launch: Launch, question: string): Promise<LaunchAnswer> {
  const fallback: LaunchAnswer = { answer: answerFromLaunch(launch, question), source: 'listing' }
  const key = questionKey(launch.id, question)
  const cached = cache.get(key)
  if (cached) return cached
  const apiKey = process.env.EXPLAINER_API_KEY?.trim()
  if (!apiKey) {
    cache.set(key, fallback)
    return fallback
  }
  try {
    const base = (process.env.EXPLAINER_API_BASE?.trim() || 'https://api.openai.com/v1').replace(/\/$/, '')
    const model = process.env.EXPLAINER_MODEL?.trim() || 'gpt-4o-mini'
    const response = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content:
              'Answer the question using only the JSON launch record. If the record does not contain the fact, say the listing does not say. Do not invent times, companies, or outcomes. Two or three plain sentences.',
          },
          { role: 'user', content: JSON.stringify({ question, record: listingFacts(launch) }) },
        ],
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return fallback
    const body = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const answer = body.choices?.[0]?.message?.content?.trim()
    if (!answer || answer.length > 900) return fallback
    const result: LaunchAnswer = { answer, source: 'model' }
    cache.set(key, result)
    return result
  } catch {
    return fallback
  }
}
