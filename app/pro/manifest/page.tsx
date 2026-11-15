import type { Metadata } from 'next'
import { ManifestDesk } from '@/components/pro/manifest-desk'
import { loadProBoard } from '@/lib/pro/load'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Manifest',
  description: 'Upcoming launches filtered by customer, rideshare, orbit, and site, with a CSV export.',
}

export default async function ManifestPage() {
  const { board } = await loadProBoard()
  const orbits = unique(board.launches.map((launch) => launch.orbitAbbrev ?? launch.orbitName ?? '')).sort()
  const sites = unique(board.launches.map((launch) => launch.padLocation ?? launch.padName)).sort()
  return (
    <main id="content" className="wrap page">
      <p className="kicker">Payloads and rideshare</p>
      <h1>Manifest</h1>
      <p className="lede">
        Filter the public board by customer, orbit, or site. Rideshare keeps a flight only when the listing names Transporter, Bandwagon, or rideshare.
      </p>
      <ManifestDesk launches={board.launches} orbits={orbits} sites={sites} />
    </main>
  )
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}
