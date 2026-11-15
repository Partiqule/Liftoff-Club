'use client'

import { useMemo } from 'react'
import { useProStore } from '@/components/pro/use-pro-store'
import { launchesForTargets, type ConstellationRef } from '@/lib/pro/watch'
import type { Launch } from '@/lib/types'

export function ReviewForm({
  companies,
  launches,
  constellations,
  year,
  quarter,
  now,
}: {
  companies: { slug: string; name: string }[]
  launches: Launch[]
  constellations: ConstellationRef[]
  year: number
  quarter: number
  now: number
}) {
  const { store, ready } = useProStore()
  const saved = useMemo(() => {
    if (!ready) return []
    return launchesForTargets(launches, store.targets, constellations, now).slice(0, 12)
  }, [ready, launches, store.targets, constellations, now])
  const savedCompanies = store.targets.filter((target) => target.kind === 'company')

  return (
    <form className="pro-filters review-controls" method="get">
      <label className="pro-field">
        <span>Company</span>
        <select className="pro-select" name="company" defaultValue="">
          <option value="">Choose</option>
          {savedCompanies.map((target) => (
            <option key={`saved-${target.id}`} value={target.id}>
              Saved: {target.label}
            </option>
          ))}
          {companies.map((company) => (
            <option key={company.slug} value={company.slug}>
              {company.name}
            </option>
          ))}
        </select>
      </label>
      <label className="pro-field">
        <span>Year</span>
        <input className="field" name="year" defaultValue={String(year)} inputMode="numeric" />
      </label>
      <label className="pro-field">
        <span>Quarter</span>
        <select className="pro-select" name="quarter" defaultValue={String(quarter)}>
          <option value="1">January through March</option>
          <option value="2">April through June</option>
          <option value="3">July through September</option>
          <option value="4">October through December</option>
        </select>
      </label>
      <label className="pro-field">
        <span>Saved launches</span>
        <select className="pro-select" name="launches" defaultValue="">
          <option value="">None</option>
          {saved.length > 0 ? <option value={saved.map((launch) => launch.id).join(',')}>All saved launches on the board</option> : null}
        </select>
      </label>
      <div className="pro-field">
        <span>Build</span>
        <button className="btn" type="submit">
          Build the review
        </button>
      </div>
    </form>
  )
}
