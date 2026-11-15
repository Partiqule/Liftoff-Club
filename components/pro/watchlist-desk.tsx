'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useProStore } from '@/components/pro/use-pro-store'
import type { DeskOption } from '@/lib/pro/options'
import {
  addTarget,
  changesSince,
  markSeen,
  nextForTarget,
  removeTarget,
  snapshotTarget,
  targetKey,
  type ConstellationRef,
  type WatchTarget,
} from '@/lib/pro/watch'
import type { Launch } from '@/lib/types'

export function WatchlistDesk({
  launches,
  constellations,
  choices,
  now,
}: {
  launches: Launch[]
  constellations: ConstellationRef[]
  choices: DeskOption[]
  now: number
}) {
  const { store, setStore, ready } = useProStore()
  const [kind, setKind] = useState<DeskOption['kind']>('company')
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState('')
  const options = useMemo(
    () => choices.filter((item) => item.kind === kind && item.label.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 40),
    [choices, kind, query],
  )
  function save(target: WatchTarget) {
    setStore(addTarget(store, { ...target, addedAt: new Date().toISOString() }))
  }

  function seenNow() {
    const snapshots: Record<string, ReturnType<typeof snapshotTarget>> = {}
    for (const target of store.targets) snapshots[targetKey(target)] = snapshotTarget(target, launches, constellations, now)
    setStore(markSeen(store, snapshots))
  }

  return (
    <div>
      <form
        className="pro-add"
        onSubmit={(event) => {
          event.preventDefault()
          const option = options.find((item) => item.id === picked) ?? options[0]
          if (!option) return
          save({ kind: option.kind, id: option.id, label: option.label, addedAt: '' })
          setPicked('')
          setQuery('')
        }}
      >
        <label>
          Kind
          <select className="pro-select" value={kind} onChange={(event) => setKind(event.target.value as DeskOption['kind'])}>
            <option value="company">Company</option>
            <option value="constellation">Constellation</option>
            <option value="rocket">Rocket</option>
            <option value="site">Launch site</option>
          </select>
        </label>
        <label>
          Find
          <input className="field" value={query} placeholder="York, Starlink, Cape" onChange={(event) => setQuery(event.target.value)} />
        </label>
        <label>
          Target
          <select className="pro-select" value={picked} onChange={(event) => setPicked(event.target.value)}>
            <option value="">Choose</option>
            {options.map((option) => (
              <option key={`${option.kind}:${option.id}`} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button className="btn" type="submit">
          Save target
        </button>
      </form>
      {!ready ? <p className="note">Opening saved targets.</p> : null}
      {ready && store.targets.length === 0 ? (
        <p className="lede">No saved targets yet. Add a company, a constellation, a rocket, or a launch site. It stays in this browser.</p>
      ) : null}
      <ul className="pro-cards">
        {store.targets.map((target) => {
          const next = nextForTarget(target, launches, constellations, now)
          const changes = changesSince(store.seen[targetKey(target)], next)
          return (
            <li key={targetKey(target)} className="pro-card">
              <p className="kicker">{labelKind(target.kind)}</p>
              <h2>{target.label}</h2>
              <p>
                <strong>Next. </strong>
                {next ? (
                  <Link href={`/launches/${next.id}`}>
                    {next.name}
                    {next.net ? ` · ${next.net.slice(0, 16).replace('T', ' ')} UTC` : ''}
                  </Link>
                ) : (
                  'None on the current board.'
                )}
              </p>
              <p>
                <strong>Changed. </strong>
                {changes.length === 0 ? 'Nothing new since this browser marked the board seen.' : changes.map((change) => change.text).join(' ')}
              </p>
              <button className="btn" type="button" onClick={() => setStore(removeTarget(store, targetKey(target)))}>
                Remove
              </button>
            </li>
          )
        })}
      </ul>
      {store.targets.length > 0 ? (
        <p>
          <button className="btn" type="button" onClick={seenNow}>
            Mark the board seen
          </button>
        </p>
      ) : null}
    </div>
  )
}

function labelKind(kind: DeskOption['kind']): string {
  if (kind === 'company') return 'Company'
  if (kind === 'constellation') return 'Constellation'
  if (kind === 'rocket') return 'Rocket'
  return 'Launch site'
}
