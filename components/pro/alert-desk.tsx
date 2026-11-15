'use client'

import Link from 'next/link'
import { useProStore } from '@/components/pro/use-pro-store'
import { formatMountain } from '@/lib/pro/time'
import { useActiveZone } from '@/components/use-zone'
import {
  buildFeed,
  markSeen,
  removeRule,
  snapshotTarget,
  targetKey,
  upsertRule,
  type AlertKind,
  type ConstellationRef,
  type FeedItem,
} from '@/lib/pro/watch'
import type { Launch } from '@/lib/types'

const KINDS: { kind: AlertKind; label: string; detail: string }[] = [
  { kind: 'date-set', label: 'A followed company gets a launch date', detail: 'Fires when a saved company gains a clock on the board.' },
  { kind: 'date-moved', label: 'A launch date slips or moves', detail: 'Fires when a saved company flight keeps the same listing and the clock changes.' },
  { kind: 'constellation-new', label: 'A new launch is added for a constellation', detail: 'Fires when a saved constellation gains a flight that was not on the last reading.' },
]

export function AlertDesk({
  launches,
  constellations,
  now,
  feedToken,
}: {
  launches: Launch[]
  constellations: ConstellationRef[]
  now: number
  feedToken?: string | null
}) {
  const { store, setStore, ready } = useProStore()
  const zone = useActiveZone()
  if (!ready) return <div className="pro-skeleton" aria-busy="true" aria-label="Opening saved rules" />
  const live = buildFeed(store, launches, constellations, now)
  const feed = mergeFeed(live, store.feed)
  const calendar = `/pro/calendar/feed.ics?targets=${store.targets.map((target) => `${target.kind}:${encodeURIComponent(target.id)}`).join(',')}${feedToken ? `&access=${encodeURIComponent(feedToken)}` : ''}`

  function add(kind: AlertKind) {
    if (store.rules.some((rule) => rule.kind === kind && rule.enabled)) return
    setStore(upsertRule(store, { id: kind, kind, companyId: '', enabled: true }))
  }

  function keep() {
    const snapshots: Record<string, ReturnType<typeof snapshotTarget>> = {}
    for (const target of store.targets) snapshots[targetKey(target)] = snapshotTarget(target, launches, constellations, now)
    setStore({ ...markSeen(store, snapshots), feed: mergeFeed(live, store.feed).slice(0, 50) })
  }

  return (
    <div>
      <div className="pro-rule-list">
        {KINDS.map((item) => {
          const on = store.rules.some((rule) => rule.kind === item.kind && rule.enabled)
          return (
            <article key={item.kind} className="pro-card">
              <h2>{item.label}</h2>
              <p>{item.detail}</p>
              {on ? (
                <button className="btn" type="button" onClick={() => setStore(removeRule(store, item.kind))}>
                  Turn off
                </button>
              ) : (
                <button className="btn" type="button" onClick={() => add(item.kind)}>
                  Turn on
                </button>
              )}
            </article>
          )
        })}
      </div>
      <h2>Feed</h2>
      {store.targets.length === 0 ? <p className="note">Save a target on the watchlist first. Rules only watch what you saved, and they stay in this browser.</p> : null}
      {feed.length === 0 ? <p className="note">Nothing new against the last reading. Turn a rule on, then keep a reading so the next change can land here.</p> : null}
      <ol className="pro-feed">
        {feed.map((item) => (
          <li key={item.id}>
            <p className="meta">{formatMountain(item.at, zone)}</p>
            <p>{item.launchId ? <Link href={`/launches/${item.launchId}`}>{item.text}</Link> : item.text}</p>
          </li>
        ))}
      </ol>
      {store.targets.length > 0 ? (
        <p>
          <button className="btn" type="button" onClick={keep}>
            Keep this reading
          </button>
        </p>
      ) : null}
      <h2>Calendar</h2>
      <p>Subscribe to the launches that match your saved targets. The feed uses the public board, not an account.</p>
      {store.targets.length === 0 ? (
        <p className="note">Add a target before subscribing.</p>
      ) : (
        <p>
          <a href={calendar}>Watched launches calendar</a>
        </p>
      )}
    </div>
  )
}

function mergeFeed(live: FeedItem[], saved: FeedItem[]): FeedItem[] {
  const seen = new Set<string>()
  const merged: FeedItem[] = []
  for (const item of [...live, ...saved]) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    merged.push(item)
  }
  return merged
}
