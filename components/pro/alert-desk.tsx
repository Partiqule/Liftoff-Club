'use client'

import Link from 'next/link'
import { useProStore } from '@/components/pro/use-pro-store'
import { evaluateAlerts, removeRule, targetKey, upsertRule, type AlertKind, type ConstellationRef } from '@/lib/pro/watch'
import type { Launch } from '@/lib/types'

const KINDS: { kind: AlertKind; label: string }[] = [
  { kind: 'company-launch', label: 'Company launches' },
  { kind: 'scrub-slip', label: 'Scrub or slip' },
  { kind: 'new-manifest', label: 'New manifest entry' },
]

export function AlertDesk({
  launches,
  constellations,
  now,
}: {
  launches: Launch[]
  constellations: ConstellationRef[]
  now: number
}) {
  const { store, setStore, ready } = useProStore()
  const companies = store.targets.filter((target) => target.kind === 'company')
  const hits = ready ? evaluateAlerts(store, launches, constellations, now) : []
  const feed = `/pro/calendar/feed.ics?targets=${store.targets.map((target) => `${target.kind}:${encodeURIComponent(target.id)}`).join(',')}`

  function add(kind: AlertKind, companyId = '') {
    const id = `${kind}-${companyId || 'all'}-${store.rules.length + 1}`
    setStore(upsertRule(store, { id, kind, companyId, enabled: true }))
  }

  return (
    <div>
      <div className="pro-filters">
        {KINDS.map((item) => (
          <button key={item.kind} className="btn" type="button" onClick={() => add(item.kind)}>
            Add {item.label.toLowerCase()}
          </button>
        ))}
      </div>
      {companies.length > 0 ? (
        <div className="pro-filters">
          {companies.map((company) => (
            <button key={company.id} className="btn" type="button" onClick={() => add('company-launch', company.id)}>
              Launches for {company.label}
            </button>
          ))}
        </div>
      ) : (
        <p className="note">Save a company on the watchlist if you want a rule for that name only.</p>
      )}
      <ul className="pro-cards">
        {store.rules.map((rule) => (
          <li key={rule.id} className="pro-card">
            <h2>{KINDS.find((item) => item.kind === rule.kind)?.label}</h2>
            <p className="meta">{rule.companyId ? `Limited to ${rule.companyId}.` : 'Applies to watched companies, or to every saved target for a scrub or slip.'}</p>
            <button className="btn" type="button" onClick={() => setStore(removeRule(store, rule.id))}>
              Remove rule
            </button>
          </li>
        ))}
      </ul>
      {store.rules.length === 0 ? <p className="lede">No rules yet. They stay in this browser.</p> : null}
      <h2>Matching now</h2>
      {hits.length === 0 ? <p className="note">No rule is matching the current board. A scrub or a new manifest name appears after you mark the watchlist seen, then the board changes.</p> : null}
      <ul className="pro-cards">
        {hits.map((hit, index) => (
          <li key={`${hit.ruleId}-${hit.launchId}-${index}`} className="pro-card">
            <p>
              {hit.launchId ? <Link href={`/launches/${hit.launchId}`}>{hit.text}</Link> : hit.text}
            </p>
          </li>
        ))}
      </ul>
      <h2>Calendar</h2>
      <p className="lede">Subscribe to the launches that match your saved targets. The feed uses the public board, not an account.</p>
      {store.targets.length === 0 ? (
        <p className="note">Add a target before subscribing. An empty list would be an empty calendar.</p>
      ) : (
        <p>
          <a href={feed}>Watched launches calendar</a>
          <span className="meta"> · {store.targets.map((target) => targetKey(target)).length} targets</span>
        </p>
      )}
    </div>
  )
}
