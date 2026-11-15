import type { Launch, TimelineEvent } from '@/lib/types'

export type StageStep = {
  abbrev: string
  offsetSec: number
  kid: string
  adult: string
  state: 'past' | 'now' | 'next'
}

const KID_LINES: Record<string, string> = {
  'GO for Prop Load': 'The launch team said yes to filling the tanks.',
  'Prop Load': 'Fuel is flowing in. It is extremely cold.',
  'Stage 1 LOX Load': 'The big tank is filling with liquid oxygen.',
  'Stage 2 LOX Load': 'The top of the rocket is filling its oxygen tank.',
  'Engine Chill': 'They are chilling the engines so the cold fuel does not shock them.',
  Startup: "The rocket's computer is in charge of the last minute.",
  'Tank Press': 'The tanks are being pressed up to flight pressure.',
  'GO for Launch': 'Go for launch.',
  Ignition: 'Engines are lighting.',
  Liftoff: 'Liftoff. It is leaving the pad.',
  'Max-Q': 'The air is pushing on the rocket as hard as it will.',
  MECO: 'The first engines just turned off. That is supposed to happen.',
  'Stage 2 Separation': 'The top of the rocket has let go of the bottom.',
  'SES-1': 'The second engine is burning, still climbing.',
  'Fairing Separation': 'The nose has opened. The cargo can see space.',
  'Entry Burn Startup': 'The bottom of the rocket is firing so it can come back.',
  'Entry Burn Shutdown': 'That return burn is finished.',
  'Stage 1 Landing Burn': 'The bottom of the rocket is trying to land.',
  'Stage 1 Landing': 'Landing attempt. If it sticks, this booster flies again.',
  SECO: 'The second engine is off. The cargo is nearly on its own.',
  'Second Stage Engine Cutoff': 'The second engine is off. The cargo is nearly on its own.',
}

const GENERIC: TimelineEvent[] = [
  { abbrev: 'At the pad', description: 'The vehicle is at the pad for hours of checks.', offsetSec: -6 * 3600 },
  { abbrev: 'Last hour', description: 'Inside an hour. Fueling is typical around now, but every rocket keeps its own clock.', offsetSec: -3600 },
  { abbrev: 'Ten minutes', description: 'Ten minutes. The range is usually quiet and the broadcast is in its final checks.', offsetSec: -600 },
  { abbrev: 'One minute', description: 'One minute. Automated checks take over on most orbital rockets.', offsetSec: -60 },
  { abbrev: 'Liftoff', description: 'Liftoff. The vehicle is committing to the climb.', offsetSec: 0 },
  { abbrev: 'Climbing', description: 'In the climb. The hardest push of the air is usually somewhere in these first minutes.', offsetSec: 150 },
  { abbrev: 'High up', description: 'Several minutes in. An orbital rocket is typically near stage separation or already past it.', offsetSec: 600 },
]

const GENERIC_KID: Record<string, string> = {
  'At the pad': 'The rocket is at the pad. People are still checking every piece.',
  'Last hour': 'About an hour to go. This is when cold fuel usually starts to flow.',
  'Ten minutes': 'Ten minutes. Find a comfy spot and turn the sound up.',
  'One minute': 'One minute. The rocket is almost on its own.',
  Liftoff: 'Liftoff. It is leaving the ground.',
  Climbing: 'It is climbing fast. If you are nearby, the sound arrives after the light.',
  'High up': 'If this is a trip to orbit, it is getting very high now.',
}

export function stageScript(launch: Pick<Launch, 'net' | 'timeline'>, nowMs: number): {
  kid: string
  adult: string
  steps: StageStep[]
} {
  if (!launch.net) {
    return {
      kid: 'The clock is not set yet. When a time appears, this screen becomes the countdown.',
      adult: 'No T-0 is published. The stage lines will start once a net time is on the board.',
      steps: [],
    }
  }
  const net = Date.parse(launch.net)
  if (!Number.isFinite(net)) {
    return { kid: 'The clock is not set yet.', adult: 'The published time could not be read.', steps: [] }
  }
  const elapsed = (nowMs - net) / 1000
  const source = launch.timeline.length > 0 ? launch.timeline : GENERIC
  const kidBook = launch.timeline.length > 0 ? KID_LINES : GENERIC_KID
  let currentIndex = -1
  source.forEach((event, index) => {
    if (event.offsetSec <= elapsed + 1) currentIndex = index
  })
  const steps: StageStep[] = source.map((event, index) => ({
    abbrev: event.abbrev,
    offsetSec: event.offsetSec,
    kid: kidBook[event.abbrev] ?? `Right now the call is “${event.abbrev}.”`,
    adult: event.description,
    state: index < currentIndex ? 'past' : index === currentIndex ? 'now' : 'next',
  }))
  if (currentIndex === -1) {
    const next = steps[0]
    return {
      kid: next ? `Nothing loud yet. Next: ${next.kid}` : 'The rocket is waiting.',
      adult: next ? `Before the first call. Next up: ${next.adult}` : 'Waiting on the timeline.',
      steps: steps.map((step, index) => ({ ...step, state: index === 0 ? 'next' : 'next' })),
    }
  }
  const current = steps[currentIndex]
  return { kid: current.kid, adult: current.adult, steps }
}
