import type { Metadata } from 'next'
import { ManifestDesk } from '@/components/pro/manifest-desk'
import { previewSlice } from '@/lib/pro/access-gate'
import { loadProBoard } from '@/lib/pro/load'
import { readViewer } from '@/lib/pro/viewer'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Manifest',
  description: 'Upcoming launches filtered by customer, rideshare, orbit, and site, with a CSV export.',
}

export default async function ManifestPage() {
  const viewer = await readViewer()
  const { board, day } = await loadProBoard()
  const launches = previewSlice(board.launches, viewer.level, 3)
  const orbits = unique(launches.map((launch) => launch.orbitAbbrev ?? launch.orbitName ?? '')).sort()
  const sites = unique(launches.map((launch) => launch.padLocation ?? launch.padName)).sort()
  return (
    <main id="content" className="wrap page">
      <p className="kicker">Payloads and rideshare</p>
      <h1>Manifest</h1>
      <p className="lede">
        Filter the public board by customer, orbit, or site. Rideshare keeps a flight only when the listing names Transporter, Bandwagon, or rideshare.
      </p>
      <ManifestDesk launches={launches} orbits={orbits} sites={sites} asOf={day} locked={viewer.level !== 'full'} />
    </main>
  )
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}
