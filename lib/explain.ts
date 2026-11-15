import { buildManifest } from '@/lib/manifest'
import type { Launch } from '@/lib/types'

export type Explainer = {
  kid: string
  adult: string
  source: 'template' | 'model'
}

type LaunchCore = Launch

const ORBIT_KID: Record<string, string> = {
  LEO: 'Low Earth orbit is a lap close to the planet. Satellites there can take pictures, help phones, or study the air.',
  SSO: 'This path flies over Earth in the same kind of sunlight every day, which is what picture-taking satellites like.',
  PO: 'A polar path goes over the top and bottom of Earth, so the satellite can eventually see the whole world.',
  GEO: 'This is a very high orbit where a satellite can stay over one region. That helps with TV and weather watches.',
  GTO: 'This is a stretched path that lets a satellite climb out to a very high parking spot.',
  SO: 'This path is matched to the Sun, so the satellite sees Earth in steady light.',
  MEA: 'This is a middle-height orbit, higher than the space station and lower than the TV satellites.',
  HEO: 'This is a stretched orbit. The satellite swings close to Earth and then very far away.',
}

function orbitKid(abbrev: string | null, name: string | null): string | null {
  if (abbrev && ORBIT_KID[abbrev.toUpperCase()]) return ORBIT_KID[abbrev.toUpperCase()]
  if (name && /polar/i.test(name)) return ORBIT_KID.PO
  if (name && /geo/i.test(name)) return ORBIT_KID.GEO
  if (name && /sun-synchronous|sso/i.test(name)) return ORBIT_KID.SSO
  if (name && /low earth/i.test(name)) return ORBIT_KID.LEO
  return null
}

function isCrew(launch: LaunchCore): boolean {
  const text = `${launch.missionType ?? ''} ${launch.missionName ?? ''} ${launch.name} ${launch.spacecraftName ?? ''}`
  return /crew|tourism|human|astronaut/i.test(text)
}

function isClassified(launch: LaunchCore): boolean {
  const text = `${launch.missionType ?? ''} ${launch.missionDescription ?? ''} ${launch.missionName ?? ''}`
  return /secret|classified|undisclosed|unknown payload/i.test(text)
}

function isCargo(launch: LaunchCore): boolean {
  const text = `${launch.missionType ?? ''} ${launch.name} ${launch.missionName ?? ''} ${launch.spacecraftName ?? ''}`
  return /cargo|resupply|cygnus|progress|dragon|htv|dream chaser/i.test(text) && !isCrew(launch)
}

function place(launch: LaunchCore): string {
  return launch.padLocation ?? launch.padName
}

export function templateExplain(launch: LaunchCore): Explainer {
  const rocket = launch.rocketName
  const provider = launch.provider.name
  const where = place(launch)
  const orbitLine = orbitKid(launch.orbitAbbrev, launch.orbitName)
  const manifest = launch.manifest?.length ? launch.manifest : buildManifest(launch)
  const payloadNames = manifest
    .filter((item) => item.role === 'payload' || item.role === 'spacecraft')
    .map((item) => (item.count && item.count > 1 ? `${item.count} ${item.name}` : item.name))
  const carrying = payloadNames.length > 0 ? payloadNames.slice(0, 3).join(', ') : null

  let kid: string
  if (/starlink/i.test(launch.name)) {
    const count = manifest.find((item) => /starlink/i.test(item.name))?.count
    const flock = count ? `${count} Starlink satellites` : 'a flock of Starlink satellites'
    kid = `A ${rocket} is carrying ${flock}. They are small radio stations that stay in space and help the internet reach houses, ships, and farms that do not have a cable in the ground. The bottom of the rocket tries to fly home and land so it can be used again.`
  } else if (isCrew(launch)) {
    const ship = launch.spacecraftName ? ` in a ship called ${launch.spacecraftName}` : ''
    const dest = launch.spacecraftDestination ? ` They are headed for ${launch.spacecraftDestination}.` : ''
    kid = `People are riding this ${rocket}${ship}. ${provider} is launching them from ${where}.${dest} Everyone who loves them will be watching the clock.`
  } else if (isClassified(launch)) {
    kid = `${provider} is launching a ${rocket} from ${where}. The owner of the cargo has not said what is on board. Families can still watch the rocket fly. We just do not get to know the boxes inside.`
  } else if (/moon|lunar|artemis/i.test(`${launch.name} ${launch.missionName ?? ''} ${launch.orbitName ?? ''} ${launch.spacecraftDestination ?? ''}`)) {
    kid = `This ${rocket} is aimed farther than a lap around Earth. ${provider} is sending it from ${where}${carrying ? `, carrying ${carrying}` : ''}. The ride starts as a very loud climb, then a long quiet coast.`
  } else if (isCargo(launch)) {
    kid = `${provider} is sending ${launch.spacecraftName ?? 'a cargo ship'} up on a ${rocket} from ${where}. It is a delivery run for people already in space: food, experiments, and spare parts.`
  } else if (/test|demo|maiden/i.test(`${launch.missionType ?? ''} ${launch.name}`)) {
    kid = `This is a practice flight. ${provider} is flying a ${rocket} from ${where} to learn whether the rocket behaves. The cargo matters, and so does the simple question: did it work?`
  } else {
    const customers = launch.customers
      .map((agency) => agency.name)
      .filter((name) => name.toLowerCase() !== provider.toLowerCase())
      .slice(0, 2)
    const cargoSentence = carrying
      ? `On board: ${carrying}.`
      : customers.length > 0
        ? `It is for ${customers.join(' and ')}.`
        : 'The public listing does not name a cargo yet.'
    kid = `${provider} is launching a rocket called ${rocket} from ${where}. ${cargoSentence}${orbitLine ? ` ${orbitLine}` : ''}`
  }

  const adultBits = [
    `${provider} is flying a ${rocket} from ${launch.padName}${launch.padLocation ? `, ${launch.padLocation}` : ''}.`,
    launch.missionName ? `Mission: ${launch.missionName}.` : null,
    launch.missionDescription ? launch.missionDescription.replace(/\s+/g, ' ').trim() : null,
    launch.orbitName ? `Planned orbit: ${launch.orbitName}.` : null,
    launch.boosterSerial
      ? `Booster ${launch.boosterSerial}${launch.boosterFlights ? `, flight ${launch.boosterFlights}` : ''}.`
      : null,
    launch.landingDescription,
    launch.statusDescription ? `Status: ${launch.statusName}. ${launch.statusDescription}` : `Status: ${launch.statusName}.`,
    looseClock(launch) ? 'The published time can still slip. Rockets wait for weather, boats, and the range.' : null,
  ].filter((part): part is string => Boolean(part))

  return {
    kid: kid.replace(/\s+/g, ' ').trim(),
    adult: adultBits.join(' '),
    source: 'template',
  }
}

function looseClock(launch: LaunchCore): boolean {
  const precision = (launch.precision ?? '').toLowerCase()
  if (/day|month|year|quarter|week|tbd/.test(precision)) return true
  if (!launch.net || !launch.windowEnd) return false
  const span = Date.parse(launch.windowEnd) - Date.parse(launch.net)
  return Number.isFinite(span) && span > 60 * 60 * 1000
}

type ModelCache = Map<string, Explainer>
const modelCache: ModelCache = new Map()

/**
 * Template by default. If EXPLAINER_API_KEY is set, try one OpenAI-compatible
 * chat completion and cache it by launch id plus last update. Any failure
 * falls back to the template. The key is read on the server only.
 */
export async function explainLaunch(launch: Launch): Promise<Explainer> {
  const template = templateExplain(launch)
  const apiKey = process.env.EXPLAINER_API_KEY?.trim()
  if (!apiKey) return template

  const cacheKey = `${launch.id}:${launch.lastUpdated ?? launch.net ?? ''}`
  const cached = modelCache.get(cacheKey)
  if (cached) return cached

  try {
    const base = (process.env.EXPLAINER_API_BASE?.trim() || 'https://api.openai.com/v1').replace(/\/$/, '')
    const model = process.env.EXPLAINER_MODEL?.trim() || 'gpt-4o-mini'
    const response = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You write two short explanations of a rocket launch for a family app. Return JSON {"kid","adult"}. kid is for a 7 year old: 2 to 4 sentences, concrete, no jargon, no hype. adult is plain and specific, under 120 words. Use only facts in the user payload. If the cargo is classified, say so. Do not invent companies, times, or success.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              name: launch.name,
              provider: launch.provider.name,
              rocket: launch.rocketName,
              pad: launch.padName,
              location: launch.padLocation,
              mission: launch.missionName,
              type: launch.missionType,
              description: launch.missionDescription,
              orbit: launch.orbitName,
              status: launch.statusName,
              spacecraft: launch.spacecraftName,
              destination: launch.spacecraftDestination,
              landing: launch.landingDescription,
              templateKid: template.kid,
              templateAdult: template.adult,
            }),
          },
        ],
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return template
    const body = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const content = body.choices?.[0]?.message?.content
    if (!content) return template
    const parsed = JSON.parse(content) as { kid?: unknown; adult?: unknown }
    if (typeof parsed.kid !== 'string' || typeof parsed.adult !== 'string') return template
    const kid = parsed.kid.trim()
    const adult = parsed.adult.trim()
    if (kid.length < 40 || kid.length > 900 || adult.length < 40 || adult.length > 1200) return template
    const enriched: Explainer = { kid, adult, source: 'model' }
    modelCache.set(cacheKey, enriched)
    return enriched
  } catch {
    return template
  }
}
