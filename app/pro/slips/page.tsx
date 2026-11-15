import type { Metadata } from 'next'
import Link from 'next/link'
import { previewSlice } from '@/lib/pro/access-gate'
import { readNetLog } from '@/lib/pro/net-slip-store'
import { summarizeSlips } from '@/lib/pro/net-slips'
import { readViewer } from '@/lib/pro/viewer'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Slips',
  description: 'How far published launch clocks have moved later, by rocket and provider.',
}

export default async function SlipsPage() {
  const viewer = await readViewer()
  const log = await readNetLog()
  const records = Object.values(log)
  const rockets = previewSlice(summarizeSlips(records, 'rocket'), viewer.level, 3)
  const providers = previewSlice(summarizeSlips(records, 'provider'), viewer.level, 3)
  const empty = records.length === 0 || (rockets.length === 0 && providers.length === 0)
  return (
    <main id="content" className="wrap page">
      <p className="kicker">Clock moves</p>
      <h1>Slips</h1>
      <p className="lede">Each time the public board is read, the clock for a launch is stored. A slip is a later clock. An earlier clock is not counted. The average is the mean of those later moves.</p>
      <p className="meta">Free during early access.</p>
      {empty ? <p className="note">No recorded slip yet. History starts once the board has been read more than once with a store connected.</p> : null}
      <h2>By rocket</h2>
      <Summary rows={rockets} />
      <h2>By provider</h2>
      <Summary rows={providers} />
      <p>
        <Link href="/pro/manifest">Open the manifest</Link>
      </p>
    </main>
  )
}

function Summary({ rows }: { rows: { key: string; label: string; count: number; average: number | null }[] }) {
  if (rows.length === 0) return <p className="note">No public slip on this cut yet.</p>
  return (
    <div className="pro-scroll">
      <table className="pro-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Slips</th>
            <th>Average days</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td>{row.label}</td>
              <td>{row.count}</td>
              <td>{row.average == null ? 'No public figure yet' : row.average.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
