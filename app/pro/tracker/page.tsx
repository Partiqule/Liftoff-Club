import type { Metadata } from 'next'
import { TrackerTable } from '@/components/pro/tracker-table'
import { loadProBoard } from '@/lib/pro/load'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Tracker',
  description: 'Constellations and operators, with a source and a date on every stated figure.',
}

export default async function TrackerPage() {
  const { rows } = await loadProBoard()
  return (
    <main id="content" className="wrap page">
      <p className="kicker">Competitors and constellations</p>
      <h1>Tracker</h1>
      <p className="lede">
        Satellites in orbit come from the CelesTrak catalog. Last launch and launches this year come from Launch Library 2. A planned size or a capacity number appears only with a public source and a date. Otherwise the cell says no public figure yet.
      </p>
      <TrackerTable rows={rows} />
    </main>
  )
}
