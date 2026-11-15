'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { filterManifest, manifestCsv } from '@/lib/pro/manifest-intel'
import type { Launch } from '@/lib/types'

export function ManifestDesk({ launches, orbits, sites }: { launches: Launch[]; orbits: string[]; sites: string[] }) {
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
          <input className="field" value={company} placeholder="York, NASA, Starlink" onChange={(event) => setCompany(event.target.value)} />
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
      <div className="pro-scroll">
        <table className="pro-table">
          <thead>
            <tr>
              <th scope="col">Launch</th>
              <th scope="col">When</th>
              <th scope="col">Rocket</th>
              <th scope="col">Orbit</th>
              <th scope="col">Site</th>
              <th scope="col">Companies</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((launch) => (
              <tr key={launch.id}>
                <th scope="row">
                  <Link href={`/launches/${launch.id}`}>{launch.name}</Link>
                </th>
                <td>{launch.net ? `${launch.net.slice(0, 16).replace('T', ' ')} UTC` : 'Time not set'}</td>
                <td>{launch.rocketName}</td>
                <td>{launch.orbitAbbrev ?? launch.orbitName ?? 'Not listed'}</td>
                <td>{launch.padLocation ?? launch.padName}</td>
                <td>{unique(launch.manifest.map((item) => item.company)).slice(0, 4).join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? <p className="note">Nothing on the board matches this filter.</p> : null}
    </div>
  )
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}
