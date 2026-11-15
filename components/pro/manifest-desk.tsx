'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { filterManifest, manifestCsv, manifestFacts } from '@/lib/pro/manifest-intel'
import { formatMountain } from '@/lib/pro/time'
import type { Launch } from '@/lib/types'

export function ManifestDesk({
  launches,
  orbits,
  sites,
  asOf,
}: {
  launches: Launch[]
  orbits: string[]
  sites: string[]
  asOf: string | null
}) {
  const [company, setCompany] = useState('')
  const [rideshare, setRideshare] = useState(false)
  const [orbit, setOrbit] = useState('')
  const [site, setSite] = useState('')
  const rows = useMemo(() => filterManifest(launches, { company, rideshare, orbit, site }), [launches, company, rideshare, orbit, site])

  function download() {
    const file = new Blob([manifestCsv(rows)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = 'liftoff-club-pro-manifest.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <form className="pro-filters" onSubmit={(event) => event.preventDefault()}>
        <label>
          Customer or payload
          <input className="field" value={company} placeholder="Company or payload name" onChange={(event) => setCompany(event.target.value)} />
        </label>
        <label className="pro-check">
          <input type="checkbox" checked={rideshare} onChange={(event) => setRideshare(event.target.checked)} />
          Rideshare only
        </label>
        <label>
          Orbit
          <select className="pro-select" value={orbit} onChange={(event) => setOrbit(event.target.value)}>
            <option value="">Any orbit</option>
            {orbits.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          Site
          <select className="pro-select" value={site} onChange={(event) => setSite(event.target.value)}>
            <option value="">Any site</option>
            {sites.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <button className="btn" type="button" onClick={download} disabled={rows.length === 0}>
          Export CSV
        </button>
      </form>
      <p className="meta">{rows.length} flights on this cut of the public board.</p>
      <div className="pro-manifest">
        {rows.map((launch) => (
          <article key={launch.id} className="pro-card">
            <h2>
              <Link href={`/launches/${launch.id}`}>{launch.name}</Link>
            </h2>
            <p className="meta">
              {formatMountain(launch.net)} · {launch.rocketName}
            </p>
            <dl className="pro-facts">
              {manifestFacts(launch, asOf).map((fact) => (
                <div key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>
                    {fact.text}
                    {fact.sourceUrl && fact.asOf ? (
                      <>
                        {' '}
                        <a href={fact.sourceUrl}>{fact.sourceTitle}</a>
                        {' · as of '}
                        {fact.asOf}
                      </>
                    ) : null}
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
      {rows.length === 0 ? <p className="note">Nothing on the board matches this filter.</p> : null}
    </div>
  )
}
