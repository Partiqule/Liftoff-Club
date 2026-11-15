export type Agency = {
  name: string
  abbrev: string | null
  description: string | null
  country: string | null
  siteUrl: string | null
  type: string | null
  /** Stable company id, shared with `/companies/[slug]`. */
  companyId: string | null
}

export type PayloadHint = {
  name: string
  company: string | null
  companyId: string | null
  companyDescription: string | null
  kind: string | null
  description: string | null
  count: number | null
  siteUrl: string | null
}

export type ManifestItem = {
  id: string
  name: string
  company: string
  /** Stable id. Same company keeps this id across launches and name spellings. */
  companyId: string
  companySlug: string
  role: 'provider' | 'payload' | 'customer' | 'spacecraft'
  kind: string | null
  count: number | null
  brief: string
  kidBrief: string
  careersUrl: string | null
  siteUrl: string | null
}

export type TimelineEvent = {
  abbrev: string
  description: string
  offsetSec: number
}

export type Launch = {
  id: string
  name: string
  provider: Agency
  rocketName: string
  rocketFamily: string | null
  missionName: string | null
  missionType: string | null
  missionDescription: string | null
  orbitName: string | null
  orbitAbbrev: string | null
  customers: Agency[]
  padName: string
  padLocation: string | null
  padLat: number | null
  padLon: number | null
  net: string | null
  windowStart: string | null
  windowEnd: string | null
  precision: string | null
  statusName: string
  statusAbbrev: string
  statusDescription: string | null
  webcastUrl: string | null
  webcastTitle: string | null
  webcasts: { title: string; url: string }[]
  infoUrl: string | null
  timeline: TimelineEvent[]
  updates: { at: string | null; text: string }[]
  lastUpdated: string | null
  probability: number | null
  weatherConcerns: string | null
  boosterSerial: string | null
  boosterFlights: number | null
  boosterReused: boolean | null
  boosterCareerFlights: number | null
  boosterSuccessfulLandings: number | null
  boosterAttemptedLandings: number | null
  previousFlightName: string | null
  landingDescription: string | null
  landingLocation: string | null
  spacecraftName: string | null
  spacecraftDestination: string | null
  payloadHints: PayloadHint[]
  manifest: ManifestItem[]
  /** Program names from Launch Library 2, when the listing has any. */
  programs: string[]
  featured: boolean
}

export type LaunchBoard = {
  launches: Launch[]
  fetchedAt: string
  source: 'live' | 'cache' | 'fallback'
  stale: boolean
  notice: string | null
  total: number | null
}

export type LaunchBrief = {
  id: string
  name: string
  providerName: string
  rocketName: string
  missionType: string | null
  net: string | null
  windowStart: string | null
  windowEnd: string | null
  precision: string | null
  statusAbbrev: string
  statusName: string
  padName: string
  padLocation: string | null
  padLat: number | null
  padLon: number | null
  featured: boolean
}

export type PassGrade = 'great' | 'good' | 'fair' | 'poor'

export type SkyPass = {
  id: string
  name: string
  kind: 'iss' | 'starlink'
  noradId: string
  start: string
  peak: string
  end: string
  riseAzimuth: number
  peakAzimuth: number
  setAzimuth: number
  maxElevation: number
  durationSec: number
  illuminatedAtPeak: boolean
  sunElevationAtPeak: number
  setsInShadow: boolean
  grade: PassGrade
  gradeLabel: string
  gradeReason: string
}

export type SeeGrade = 'likely' | 'maybe' | 'unlikely' | 'too-far' | 'unknown'

export type SeeVerdict = {
  grade: SeeGrade
  miles: number | null
  kilometers: number | null
  direction: string | null
  summary: string
  detail: string
}

export type SkyCall = 'go' | 'maybe' | 'nogo' | 'unknown'

export type SkyJudgement = {
  call: SkyCall
  label: string
  reason: string
  cloud: number | null
}

export type Place = {
  label: string
  lat: number
  lon: number
  timezone: string
  source: 'browser' | 'search'
}

export type AlertRules = {
  starship: boolean
  visibleFromHere: boolean
  hourWithWeather: boolean
}

export type NotificationSettings = {
  enabled: boolean
  leadMinutes: 30 | 60 | 180
  providerMode: 'all' | 'spacex' | 'chosen'
  providers: string[]
  visibleOnly: boolean
  includeSky: boolean
  rules: AlertRules
}

export type Settings = {
  kidsMode: boolean
  nightRed: boolean
  quietStart: string
  quietEnd: string
  notifications: NotificationSettings
  location: Place | null
  /** auto uses the device zone. chosen uses `zone`. */
  zoneMode: 'auto' | 'chosen'
  zone: string
}

export type AlertCandidate = {
  id: string
  title: string
  body: string
  url: string
  when: number
}
