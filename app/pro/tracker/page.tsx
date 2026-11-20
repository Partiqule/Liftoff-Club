import type { Metadata } from 'next'
import { Cited } from '@/components/pro/cited'
import { MonthChart } from '@/components/pro/month-chart'
import { TrackerTable } from '@/components/pro/tracker-table'
import { previewSlice } from '@/lib/pro/access-gate'
import { loadProBoard } from '@/lib/pro/load'
import { readViewer } from '@/lib/pro/viewer'

export const revalidate = 3600
export const maxDuration = 60

export const metadata: Metadata = {
  title: 'Tracker',
  description: 'Constellations and operators, with a source and a date on every stated figure.',
}

export default async function TrackerPage() {
  const viewer = await readViewer()
  const { rows } = await loadProBoard()
  const shown = previewSlice(rows, viewer.level, 2)
  return (
    <main id="content" className="wrap page">
      <p className="kicker">Competitors and constellations</p>
      <h1>Tracker</h1>
      <p className="lede">
        Satellites in orbit come from the CelesTrak catalog. Last launch and launches this year come from Launch Library 2. A planned size or a capacity number appears only with a public source and a date. Otherwise the cell says no public figure yet.
      </p>
      <div className="pro-trends">
        {shown.map((row) => (
          <article key={row.id} className="pro-card">
            <h2>{row.name}</h2>
            <div className="pro-stat-row">
              <div>
                <p className="kicker">In orbit</p>
                <Cited cell={row.inOrbit} />
              </div>
              <div>
                <p className="kicker">Authorized</p>
                <Cited cell={row.authorized} />
              </div>
            </div>
            <p>
              <strong>Next scheduled launch. </strong>
              {row.nextLaunch.text}
            </p>
            {row.nextLaunch.sourceUrl && row.nextLaunch.asOf ? (
              <p className="meta">
                <a href={row.nextLaunch.sourceUrl}>{row.nextLaunch.sourceTitle}</a>
                {' · as of '}
                {row.nextLaunch.asOf}
              </p>
            ) : null}
            {row.months ? <MonthChart counts={row.months} label={`${row.name} launches by month`} /> : <p>No public figure yet for the monthly trend.</p>}
          </article>
        ))}
      </div>
      <TrackerTable rows={shown} />
    </main>
  )
}
