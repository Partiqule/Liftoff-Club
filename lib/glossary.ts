export type GlossaryTerm = {
  id: string
  term: string
  expands: string | null
  group: 'clock' | 'climb' | 'return' | 'orbit'
  adult: string
  kid: string
  patterns: { source: string; flags?: string }[]
}

/**
 * Hand written definitions. One sentence for a grown up, one for a child.
 * Patterns decide which words on a launch page open the card.
 */
export const GLOSSARY: GlossaryTerm[] = [
  {
    id: 't-minus',
    term: 'T minus',
    expands: null,
    group: 'clock',
    adult: 'T is the planned liftoff instant, so T minus ten minutes means ten minutes before that instant.',
    kid: 'T minus tells you how long until the rocket is supposed to leave.',
    patterns: [{ source: String.raw`\bT\s*[-−]?\s*minus\b|\bT\s*[-−]\s*\d+\b|\bT0\b` }],
  },
  {
    id: 'liftoff',
    term: 'Liftoff',
    expands: null,
    group: 'clock',
    adult: 'Liftoff is the first motion that carries the rocket off the pad under its own power.',
    kid: 'Liftoff means the rocket has left the ground.',
    patterns: [{ source: String.raw`\bliftoff\b` }],
  },
  {
    id: 'hold',
    term: 'Hold',
    expands: null,
    group: 'clock',
    adult: 'A hold pauses the countdown while the team checks something, and the clock stays put until they continue or call it off.',
    kid: 'A hold means they paused the countdown to check something, and the rocket is still on the pad.',
    patterns: [
      { source: String.raw`\b(?:a|the|countdown)\s+holds?\b|\bon hold\b|\bin a hold\b` },
      { source: String.raw`\bHold\b|\bHOLD\b`, flags: 'g' },
    ],
  },
  {
    id: 'scrub',
    term: 'Scrub',
    expands: null,
    group: 'clock',
    adult: 'A scrub calls off the launch attempt before liftoff, and the rocket stays on the ground for a later try.',
    kid: 'A scrub means they decided not to fly today, so the rocket stays on the pad.',
    patterns: [{ source: String.raw`\bscrub(?:bed|s)?\b` }],
  },
  {
    id: 'recycle',
    term: 'Recycle',
    expands: null,
    group: 'clock',
    adult: 'A recycle sets the countdown back to an earlier step so the team can try again, sometimes inside the same window.',
    kid: 'A recycle means they set the clock back and get ready to try again.',
    patterns: [{ source: String.raw`\brecycl(?:e|ed|es|ing)\b` }],
  },
  {
    id: 'abort',
    term: 'Abort',
    expands: null,
    group: 'clock',
    adult: 'An abort stops the launch before the rocket leaves, or fires a crew escape system to carry people away from a failing rocket.',
    kid: 'An abort means the launch stops before leaving, or the crew ship flies away to keep people safe.',
    patterns: [{ source: String.raw`\baborts?\b` }],
  },
  {
    id: 'go-for-launch',
    term: 'Go for launch',
    expands: null,
    group: 'clock',
    adult: 'Go for launch is the call from the launch director that the team is ready for the countdown to run through liftoff.',
    kid: 'Go for launch means the team said yes and the countdown can keep going.',
    patterns: [{ source: String.raw`\bgo for launch\b` }],
  },
  {
    id: 'net',
    term: 'NET',
    expands: 'No earlier than',
    group: 'clock',
    adult: 'No earlier than is the soonest a launch will be tried, and the time can still slip later.',
    kid: 'NET means the soonest they might launch, and it can still move later.',
    patterns: [
      { source: String.raw`\bNET\b`, flags: 'g' },
      { source: String.raw`no earlier than` },
    ],
  },
  {
    id: 'static-fire',
    term: 'Static fire',
    expands: null,
    group: 'clock',
    adult: 'A static fire lights the engines while the rocket is held down on the pad, then shuts them off, and it is not a launch.',
    kid: 'A static fire lights the engines while the rocket is still held to the pad, then turns them off.',
    patterns: [{ source: String.raw`\bstatic fires?\b` }],
  },
  {
    id: 'max-q',
    term: 'Max Q',
    expands: 'Maximum dynamic pressure',
    group: 'climb',
    adult: 'Max Q is the moment in the climb when speed and air density together push harder on the vehicle than at any other point.',
    kid: 'Max Q is when the air pushes on the rocket as hard as it will.',
    patterns: [{ source: String.raw`\bmax[\s\-]?q\b` }],
  },
  {
    id: 'meco',
    term: 'MECO',
    expands: 'Main engine cutoff',
    group: 'climb',
    adult: 'MECO is the planned shutdown of the first stage main engines, just before that stage lets go.',
    kid: 'MECO means the big engines turn off on purpose while the rocket is still flying.',
    patterns: [{ source: String.raw`\bMECO\b|main engine cutoff` }],
  },
  {
    id: 'stage-separation',
    term: 'Stage separation',
    expands: null,
    group: 'climb',
    adult: 'Stage separation is the moment the used lower stage releases the upper stage so the upper stage can keep climbing.',
    kid: 'Stage separation means the bottom lets go of the top, and the top keeps flying.',
    patterns: [{ source: String.raw`\bstage(?:\s*[12])?\s+separation\b` }],
  },
  {
    id: 'first-stage',
    term: 'First stage',
    expands: null,
    group: 'climb',
    adult: 'The first stage is the bottom of the rocket, with the engines that do most of the work of leaving the pad.',
    kid: 'The first stage is the big bottom of the rocket that lifts it off the ground.',
    patterns: [{ source: String.raw`\bfirst stage\b|\bstage\s*1\b` }],
  },
  {
    id: 'second-stage',
    term: 'Second stage',
    expands: null,
    group: 'climb',
    adult: 'The second stage is the smaller upper stage that takes over after the first stage drops away and finishes the climb toward orbit.',
    kid: 'The second stage is the smaller top of the rocket, and it keeps going after the bottom lets go.',
    patterns: [{ source: String.raw`\bsecond stage\b|\bstage\s*2\b` }],
  },
  {
    id: 'ses',
    term: 'SES',
    expands: 'Second engine start',
    group: 'climb',
    adult: 'SES is the lighting of the upper stage engine after the booster has dropped away, including a later restart.',
    kid: 'SES means the engine on the top part lights and keeps climbing.',
    patterns: [{ source: String.raw`\bSES(?:-\d+)?\b|second engine start` }],
  },
  {
    id: 'seco',
    term: 'SECO',
    expands: 'Second engine cutoff',
    group: 'climb',
    adult: 'SECO is the shutdown of the upper stage engine when that burn has reached the planned speed and path.',
    kid: 'SECO means the smaller engine on top turns off, and the cargo is on the path they wanted.',
    patterns: [{ source: String.raw`\bSECO(?:-\d+)?\b|second(?:\s+stage)? engine cutoff` }],
  },
  {
    id: 'fairing',
    term: 'Fairing',
    expands: null,
    group: 'climb',
    adult: 'The fairing is the clamshell cover that protects the payload from the air during the climb, then comes off once the air is thin.',
    kid: 'The fairing is the cover that protects the cargo from the wind, and then it comes off.',
    patterns: [{ source: String.raw`\bfairings?\b` }],
  },
  {
    id: 'fairing-separation',
    term: 'Fairing separation',
    expands: null,
    group: 'climb',
    adult: 'Fairing separation is the split and release of that nose cover once the air is too thin to harm the satellite.',
    kid: 'Fairing separation means the nose cover opens and drops away so the cargo can come out.',
    patterns: [{ source: String.raw`\bfairing separation\b` }],
  },
  {
    id: 'lox',
    term: 'LOX',
    expands: 'Liquid oxygen',
    group: 'climb',
    adult: 'LOX is oxygen chilled until it is a liquid, and engines burn it with the fuel.',
    kid: 'LOX is oxygen made so cold it turns into a liquid, and the engines mix it with fuel.',
    patterns: [{ source: String.raw`\bLOX\b|liquid oxygen` }],
  },
  {
    id: 'propellant',
    term: 'Propellant',
    expands: null,
    group: 'climb',
    adult: 'Propellant is the fuel and the oxidizer the engines burn, and on many rockets the oxidizer is liquid oxygen.',
    kid: 'Propellant is what the engines burn, including the very cold oxygen.',
    patterns: [{ source: String.raw`\bpropellants?\b` }],
  },
  {
    id: 'booster-landing',
    term: 'Booster landing',
    expands: null,
    group: 'return',
    adult: 'A booster landing is the first stage restarting its engines to set down upright, either near the pad or on a ship at sea, so it can fly again.',
    kid: 'A booster landing means the bottom of the rocket comes back and tries to land standing up.',
    patterns: [{ source: String.raw`\bbooster landings?\b|\bstage\s*1\s+landing\b` }],
  },
  {
    id: 'rtls',
    term: 'RTLS',
    expands: 'Return to launch site',
    group: 'return',
    adult: 'RTLS means the booster turns around and lands on a pad near the site it launched from, which it can do only when enough propellant is left.',
    kid: 'RTLS means the booster turns around and lands back near the launch pad.',
    patterns: [{ source: String.raw`\bRTLS\b|return to launch site` }],
  },
  {
    id: 'droneship',
    term: 'Droneship',
    expands: null,
    group: 'return',
    adult: 'A droneship is an uncrewed ship downrange with a landing deck, used when the booster cannot carry enough propellant to fly all the way back to shore.',
    kid: 'A droneship is a ship with nobody aboard that waits on the ocean so the booster can land on it.',
    patterns: [{ source: String.raw`\bdroneships?\b|\bdrone ships?\b` }],
  },
  {
    id: 'asds',
    term: 'ASDS',
    expands: 'Autonomous spaceport drone ship',
    group: 'return',
    adult: 'ASDS is the formal name for a SpaceX droneship, an uncrewed barge positioned at sea for a booster landing.',
    kid: 'ASDS is the ocean ship a booster lands on, and nobody is aboard for the landing.',
    patterns: [{ source: String.raw`\bASDS\b|autonomous spaceport drone ships?` }],
  },
  {
    id: 'entry-burn',
    term: 'Entry burn',
    expands: null,
    group: 'return',
    adult: 'The entry burn is a short firing as the booster falls back into thicker air, to slow it and steer it before the landing burn.',
    kid: 'The entry burn lights the engines on the booster on the way down so it does not fall too fast.',
    patterns: [{ source: String.raw`\bentry burns?\b` }],
  },
  {
    id: 'landing-burn',
    term: 'Landing burn',
    expands: null,
    group: 'return',
    adult: 'The landing burn is the final engine firing just above the pad or the ship that slows the booster for touchdown.',
    kid: 'The landing burn is the last burst of the engines so the booster can set down softly.',
    patterns: [{ source: String.raw`\blanding burns?\b` }],
  },
  {
    id: 'expended',
    term: 'Expended',
    expands: null,
    group: 'return',
    adult: 'An expended stage is not recovered. It falls into the ocean or burns up after this single flight.',
    kid: 'Expended means this part of the rocket is not coming home, because it flies only once.',
    patterns: [{ source: String.raw`\bexpended\b` }],
  },
  {
    id: 'splashdown',
    term: 'Splashdown',
    expands: null,
    group: 'return',
    adult: 'A splashdown is a landing in the water, used by some crew capsules and by stages that are not trying to stand on a deck.',
    kid: 'A splashdown means coming down in the ocean.',
    patterns: [{ source: String.raw`\bsplashdowns?\b` }],
  },
  {
    id: 'downrange',
    term: 'Downrange',
    expands: null,
    group: 'return',
    adult: 'Downrange means farther along the flight path, away from the pad and usually out over the ocean.',
    kid: 'Downrange means farther ahead, the way the rocket is flying, usually over the ocean.',
    patterns: [{ source: String.raw`\bdownrange\b` }],
  },
  {
    id: 'leo',
    term: 'LEO',
    expands: 'Low Earth orbit',
    group: 'orbit',
    adult: 'LEO is a path from roughly 160 to 2,000 kilometers up, where the space station and constellations such as Starlink fly.',
    kid: 'LEO is a lap around Earth that stays fairly close, and the space station flies there.',
    patterns: [{ source: String.raw`\bLEO\b|low earth orbits?` }],
  },
  {
    id: 'gto',
    term: 'GTO',
    expands: 'Geostationary transfer orbit',
    group: 'orbit',
    adult: 'GTO is a stretched path with a high point near geostationary height, so the satellite can circularize that orbit with its own engine.',
    kid: 'GTO is a stretched path that carries a satellite most of the way to the high parking spot, and the satellite does the last push.',
    patterns: [{ source: String.raw`\bGTO\b|geostationary transfer orbits?` }],
  },
  {
    id: 'geo',
    term: 'GEO',
    expands: 'Geostationary orbit',
    group: 'orbit',
    adult: 'GEO is a circular path about 35,786 kilometers above the equator, where a satellite circles once a day and stays over one longitude.',
    kid: 'GEO is a very high path where a satellite can stay over one spot because it circles as fast as Earth turns.',
    patterns: [{ source: String.raw`\bGEO\b|geostationary orbits?` }],
  },
  {
    id: 'sso',
    term: 'SSO',
    expands: 'Sun synchronous orbit',
    group: 'orbit',
    adult: 'SSO is a near polar orbit whose plane drifts with the seasons so the satellite crosses places in about the same local sunlight each day.',
    kid: 'SSO is a path nearly over the poles that sees the ground in the same kind of daylight each day.',
    patterns: [{ source: String.raw`\bSSO\b|sun[\s-]synchronous orbits?` }],
  },
  {
    id: 'polar',
    term: 'Polar orbit',
    expands: null,
    group: 'orbit',
    adult: 'A polar orbit passes over or near both poles, so Earth turns underneath and the satellite can eventually see most of the planet.',
    kid: 'A polar orbit goes over the top and bottom of Earth, so the satellite can see almost the whole world.',
    patterns: [{ source: String.raw`\bpolar orbits?\b` }],
  },
  {
    id: 'apogee',
    term: 'Apogee',
    expands: null,
    group: 'orbit',
    adult: 'Apogee is the highest point of an orbit around Earth, where the satellite is farthest from the planet.',
    kid: 'Apogee is the farthest that path gets from Earth.',
    patterns: [{ source: String.raw`\bapogees?\b` }],
  },
  {
    id: 'perigee',
    term: 'Perigee',
    expands: null,
    group: 'orbit',
    adult: 'Perigee is the lowest point of an orbit around Earth, where the satellite is closest to the planet.',
    kid: 'Perigee is the closest that path gets to Earth.',
    patterns: [{ source: String.raw`\bperigees?\b` }],
  },
]

export const GLOSSARY_GROUPS: { id: GlossaryTerm['group']; label: string }[] = [
  { id: 'clock', label: 'The clock' },
  { id: 'climb', label: 'The climb' },
  { id: 'return', label: 'Coming back' },
  { id: 'orbit', label: 'Orbits' },
]

export type GlossarySegment = { type: 'text'; value: string } | { type: 'term'; id: string; value: string }

export function getTerm(id: string): GlossaryTerm | undefined {
  return GLOSSARY.find((term) => term.id === id)
}

export function termsInGroup(group: GlossaryTerm['group']): GlossaryTerm[] {
  return GLOSSARY.filter((term) => term.group === group)
}

type Hit = { start: number; end: number; id: string }

function hitsIn(text: string): Hit[] {
  const hits: Hit[] = []
  for (const term of GLOSSARY) {
    for (const pattern of term.patterns) {
      const flags = pattern.flags ?? 'gi'
      const expression = new RegExp(pattern.source, flags.includes('g') ? flags : `${flags}g`)
      for (const match of text.matchAll(expression)) {
        if (match.index == null || match[0].length === 0) continue
        hits.push({ start: match.index, end: match.index + match[0].length, id: term.id })
      }
    }
  }
  hits.sort((a, b) => a.start - b.start || b.end - a.end)
  const chosen: Hit[] = []
  let cursor = 0
  for (const hit of hits) {
    if (hit.start < cursor) continue
    chosen.push(hit)
    cursor = hit.end
  }
  return chosen
}

/** Split copy so the longest matching launch term wins and the rest stays plain text. */
export function splitGlossary(text: string): GlossarySegment[] {
  if (!text) return []
  const chosen = hitsIn(text)
  if (chosen.length === 0) return [{ type: 'text', value: text }]
  const segments: GlossarySegment[] = []
  let cursor = 0
  for (const hit of chosen) {
    if (hit.start > cursor) segments.push({ type: 'text', value: text.slice(cursor, hit.start) })
    segments.push({ type: 'term', id: hit.id, value: text.slice(hit.start, hit.end) })
    cursor = hit.end
  }
  if (cursor < text.length) segments.push({ type: 'text', value: text.slice(cursor) })
  return segments
}
