'use client'

import Link from 'next/link'
import { FigureLine } from '@/components/pro/figure-line'
import { useMemo, useState } from 'react'
import { filterManifest, isRideshareLaunch, manifestCsv, manifestFacts } from '@/lib/pro/manifest-intel'
import { formatMountain } from '@/lib/pro/time'
import { useActiveZone } from '@/components/use-zone'
import type { Launch } from '@/lib/types'

export function ManifestDesk({
  launches,
  orbits,
  sites,
  asOf,
  refreshedAt,
}: {
  launches: Launch[]
  orbits: string[]
  sites: string[]
  asOf: string | null
  refreshedAt: string | null
}) {
  const zone = useActiveZone()
  const [company, setCompany] = useState('')
  const [rideshare, setRideshare] = useState(false)
  const [orbit, setOrbit] = useState('')
  const [site, setSite] = useState('')
  const rows = useMemo(() => filterManifest(launches, { company, rideshare, orbit, site }), [launches, company, rideshare, orbit, site])
  const knownRideshare = useMemo(
    () => launches.filter(isRideshareLaunch).sort((a, b) => Date.parse(a.net ?? '') - Date.parse(b.net ?? '')),
    [launches],
  )

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
        <label className="pro-field">
          <span>Customer or payload</span>
          <input className="field" value={company} placeholder="Company or payload name" onChange={(event) => setCompany(event.target.value)} />
        </label>
        <label className="pro-field">
          <span>Rideshare</span>
          <span className="pro-check">
            <input type="checkbox" checked={rideshare} onChange={(event) => setRideshare(event.target.checked)} />
            Rideshare only
          </span>
        </label>
        <label className="pro-field">
          <span>Orbit</span>
          <select className="pro-select" value={orbit} onChange={(event) => setOrbit(event.target.value)}>
            <option value="">Any orbit</option>
            {orbits.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="pro-field">
          <span>Site</span>
          <select className="pro-select" value={site} onChange={(event) => setSite(event.target.value)}>
            <option value="">Any site</option>
            {sites.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <div className="pro-field">
          <span>Export</span>
          <button className="btn pro-export" type="button" onClick={download} disabled={rows.length === 0}>
            Export CSV
          </button>
        </div>
      </form>
      <p className="meta">{rows.length} flights on this cut of the public board.</p>
      <div className="pro-manifest">
        {rows.map((launch) => (
          <article key={launch.id} className="pro-card">
            <h2>
              <Link href={`/launches/${launch.id}`}>{launch.name}</Link>
            </h2>
            <p className="pro-time">
              {formatMountain(launch.net, zone)} · {launch.rocketName}
            </p>
            <dl className="pro-facts">
              {manifestFacts(launch, asOf).map((fact) => (
                <div key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>
                    <FigureLine text={fact.text} />
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
      {rows.length === 0 ? (
        <div className="note">
          <p>Nothing on this cut of the board matches the filter.</p>
          {rideshare && knownRideshare.length > 0 ? (
            <>
              <p>Next known rideshare flights on the wider public list:</p>
              <ul>
                {knownRideshare.slice(0, 6).map((launch) => (
                  <li key={launch.id}>
                    <Link href={`/launches/${launch.id}`}>{launch.name}</Link>
                    {launch.net ? <span className="meta"> {formatMountain(launch.net, zone)}</span> : null}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {rideshare && knownRideshare.length === 0 ? (
            <p>No rideshare flight is on the public board. Last refresh {refreshedAt ? new Date(refreshedAt).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : 'not recorded'}.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
