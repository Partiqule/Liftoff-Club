import { companySlug } from '@/lib/companies'
import type { Launch } from '@/lib/types'

export const PRO_STORE_KEY = 'liftoff-club-pro-v1'

export type WatchKind = 'company' | 'constellation' | 'rocket' | 'site'

export type WatchTarget = {
  kind: WatchKind
  id: string
  label: string
  addedAt: string
}

export type AlertKind = 'company-launch' | 'scrub-slip' | 'new-manifest'

export type AlertRule = {
  id: string
  kind: AlertKind
  /** Empty means every watched company. */
  companyId: string
  enabled: boolean
}

export type SeenState = {
  nextId: string | null
  nextNet: string | null
  status: string | null
  manifest: string[]
}

export type ProStore = {
  version: 1
  targets: WatchTarget[]
  rules: AlertRule[]
  seen: Record<string, SeenState>
}

export type ConstellationRef = {
  id: string
  name: string
  pattern: string
}

export type DeskNext = {
  id: string
  name: string
  net: string | null
  status: string
  manifest: string[]
}

export type DeskChange = {
  kind: 'slip' | 'scrub' | 'manifest' | 'next'
  text: string
}

const KINDS = new Set<WatchKind>(['company', 'constellation', 'rocket', 'site'])
const ALERTS = new Set<AlertKind>(['company-launch', 'scrub-slip', 'new-manifest'])

export function emptyStore(): ProStore {
  return { version: 1, targets: [], rules: [], seen: {} }
}

export function targetKey(target: Pick<WatchTarget, 'kind' | 'id'>): string {
  return `${target.kind}:${target.id}`
}

export function sanitizeStore(value: unknown): ProStore {
  if (!value || typeof value !== 'object') return emptyStore()
  const raw = value as Partial<ProStore>
  const targets = Array.isArray(raw.targets)
    ? raw.targets.map(readTarget).filter((item): item is WatchTarget => Boolean(item))
    : []
  const rules = Array.isArray(raw.rules) ? raw.rules.map(readRule).filter((item): item is AlertRule => Boolean(item)) : []
  const seen: Record<string, SeenState> = {}
  if (raw.seen && typeof raw.seen === 'object') {
    for (const [key, item] of Object.entries(raw.seen as Record<string, unknown>)) {
      const state = readSeen(item)
      if (state && key.length < 180) seen[key] = state
    }
  }
  const unique = new Map<string, WatchTarget>()
  for (const target of targets) unique.set(targetKey(target), target)
  return { version: 1, targets: [...unique.values()].slice(0, 80), rules: rules.slice(0, 40), seen }
}

export function addTarget(store: ProStore, target: WatchTarget): ProStore {
  if (store.targets.some((item) => targetKey(item) === targetKey(target))) return store
  return { ...store, targets: [...store.targets, target] }
}

export function removeTarget(store: ProStore, key: string): ProStore {
  const seen = { ...store.seen }
  delete seen[key]
  return { ...store, targets: store.targets.filter((item) => targetKey(item) !== key), seen }
}

export function upsertRule(store: ProStore, rule: AlertRule): ProStore {
  const rules = store.rules.some((item) => item.id === rule.id)
    ? store.rules.map((item) => (item.id === rule.id ? rule : item))
    : [...store.rules, rule]
  return { ...store, rules }
}

export function removeRule(store: ProStore, id: string): ProStore {
  return { ...store, rules: store.rules.filter((item) => item.id !== id) }
}

export function isScrubOrSlip(statusName: string, statusAbbrev: string): boolean {
  const text = `${statusAbbrev} ${statusName}`.toLowerCase()
  return /\bscrub|\bhold\b|\bslip|\bdelay|postpon/.test(text)
}

export function launchMatches(target: WatchTarget, launch: Launch, constellations: ConstellationRef[]): boolean {
  if (target.kind === 'company') {
    return launch.manifest.some((item) => item.companySlug === target.id) || launch.provider.companyId === target.id
  }
  if (target.kind === 'constellation') {
    const profile = constellations.find((item) => item.id === target.id)
    if (!profile) return false
    const text = `${launch.name} ${launch.missionName ?? ''} ${launch.rocketName}`
    try {
      return new RegExp(profile.pattern, 'i').test(text)
    } catch {
      return false
    }
  }
  if (target.kind === 'rocket') return companySlug(launch.rocketName) === target.id
  return companySlug(launch.padLocation ?? launch.padName) === target.id
}

export function launchesForTargets(
  launches: Launch[],
  targets: WatchTarget[],
  constellations: ConstellationRef[],
  now = Date.now(),
): Launch[] {
  const matched = launches.filter(
    (launch) => stillAhead(launch, now) && targets.some((target) => launchMatches(target, launch, constellations)),
  )
  return matched.sort((a, b) => (a.net ?? '9999').localeCompare(b.net ?? '9999'))
}

export function snapshotTarget(
  target: WatchTarget,
  launches: Launch[],
  constellations: ConstellationRef[],
  now = Date.now(),
): SeenState {
  const matching = launches.filter((launch) => launchMatches(target, launch, constellations) && stillAhead(launch, now))
  const next = matching[0] ?? null
  const names = new Set<string>()
  for (const launch of matching) {
    for (const item of launch.manifest) names.add(item.name)
  }
  return {
    nextId: next?.id ?? null,
    nextNet: next?.net ?? null,
    status: next ? `${next.statusAbbrev} ${next.statusName}` : null,
    manifest: [...names].sort(),
  }
}

export function nextForTarget(
  target: WatchTarget,
  launches: Launch[],
  constellations: ConstellationRef[],
  now = Date.now(),
): DeskNext | null {
  const state = snapshotTarget(target, launches, constellations, now)
  if (!state.nextId) return null
  const launch = launches.find((item) => item.id === state.nextId)
  if (!launch) return null
  return {
    id: launch.id,
    name: launch.name,
    net: launch.net,
    status: `${launch.statusAbbrev} ${launch.statusName}`,
    manifest: state.manifest,
  }
}

export function changesSince(seen: SeenState | undefined, next: DeskNext | null): DeskChange[] {
  if (!seen || !next) return []
  const changes: DeskChange[] = []
  if (seen.nextId && next.id !== seen.nextId) {
    changes.push({ kind: 'next', text: 'A different flight is next on the board.' })
  } else if (seen.nextId && next.id === seen.nextId && seen.nextNet && next.net && seen.nextNet !== next.net) {
    changes.push({ kind: 'slip', text: 'The published clock moved.' })
  }
  if (isScrubOrSlip(next.status, '') && next.status !== seen.status) {
    changes.push({ kind: 'scrub', text: `Status is now ${next.status}.` })
  }
  if (seen.manifest.length > 0) {
    const known = new Set(seen.manifest)
    const fresh = next.manifest.filter((name) => !known.has(name))
    if (fresh.length > 0) changes.push({ kind: 'manifest', text: `New on the manifest: ${fresh.slice(0, 3).join(', ')}.` })
  }
  return changes
}

export function markSeen(store: ProStore, snapshots: Record<string, SeenState>): ProStore {
  return { ...store, seen: { ...store.seen, ...snapshots } }
}

export function targetsFromQuery(value: string): WatchTarget[] {
  const targets: WatchTarget[] = []
  for (const part of value.split(',')) {
    const [kind, id] = part.split(':')
    if (!kind || !id || !KINDS.has(kind as WatchKind)) continue
    const clean = decodeURIComponent(id).trim()
    if (!clean) continue
    targets.push({ kind: kind as WatchKind, id: clean.slice(0, 80), label: clean.slice(0, 80), addedAt: new Date(0).toISOString() })
  }
  return targets.slice(0, 80)
}

export type AlertHit = {
  ruleId: string
  kind: AlertKind
  launchId: string
  text: string
}

export function evaluateAlerts(
  store: ProStore,
  launches: Launch[],
  constellations: ConstellationRef[],
  now = Date.now(),
): AlertHit[] {
  const hits: AlertHit[] = []
  for (const rule of store.rules) {
    if (!rule.enabled) continue
    if (rule.kind === 'company-launch') {
      const ids = rule.companyId
        ? [rule.companyId]
        : store.targets.filter((target) => target.kind === 'company').map((target) => target.id)
      for (const id of ids) {
        const target: WatchTarget = { kind: 'company', id, label: id, addedAt: '' }
        const matched = launches.filter((launch) => launchMatches(target, launch, constellations) && stillAhead(launch, now))
        for (const launch of matched.slice(0, 6)) {
          hits.push({ ruleId: rule.id, kind: rule.kind, launchId: launch.id, text: `${launch.name} names this company.` })
        }
      }
    }
    if (rule.kind === 'scrub-slip' || rule.kind === 'new-manifest') {
      const targets =
        rule.kind === 'new-manifest'
          ? store.targets.filter((target) => target.kind === 'company' && (!rule.companyId || target.id === rule.companyId))
          : store.targets
      for (const target of targets) {
        const next = nextForTarget(target, launches, constellations, now)
        for (const change of changesSince(store.seen[targetKey(target)], next)) {
          const wanted = rule.kind === 'new-manifest' ? change.kind === 'manifest' : change.kind === 'slip' || change.kind === 'scrub'
          if (!wanted || !next) continue
          hits.push({ ruleId: rule.id, kind: rule.kind, launchId: next.id, text: `${target.label}: ${change.text}` })
        }
      }
    }
  }
  return hits.slice(0, 40)
}

function stillAhead(launch: Launch, now: number): boolean {
  if (!launch.net) return true
  const when = Date.parse(launch.net)
  if (!Number.isFinite(when)) return true
  return when > now - 30 * 60 * 1000
}

function readTarget(value: unknown): WatchTarget | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Partial<WatchTarget>
  if (!item.kind || !KINDS.has(item.kind)) return null
  if (typeof item.id !== 'string' || !item.id.trim()) return null
  if (typeof item.label !== 'string' || !item.label.trim()) return null
  const addedAt = typeof item.addedAt === 'string' && Number.isFinite(Date.parse(item.addedAt)) ? item.addedAt : new Date(0).toISOString()
  return { kind: item.kind, id: item.id.trim().slice(0, 80), label: item.label.trim().slice(0, 120), addedAt }
}

function readRule(value: unknown): AlertRule | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Partial<AlertRule>
  if (typeof item.id !== 'string' || !item.id.trim()) return null
  if (!item.kind || !ALERTS.has(item.kind)) return null
  return {
    id: item.id.trim().slice(0, 40),
    kind: item.kind,
    companyId: typeof item.companyId === 'string' ? item.companyId.trim().slice(0, 80) : '',
    enabled: item.enabled !== false,
  }
}

function readSeen(value: unknown): SeenState | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Partial<SeenState>
  const manifest = Array.isArray(item.manifest) ? item.manifest.filter((name): name is string => typeof name === 'string').slice(0, 60) : []
  return {
    nextId: typeof item.nextId === 'string' ? item.nextId : null,
    nextNet: typeof item.nextNet === 'string' ? item.nextNet : null,
    status: typeof item.status === 'string' ? item.status : null,
    manifest,
  }
}
