import type { Metadata } from 'next'
import { previewSlice } from '@/lib/pro/access-gate'
import { filterFilings } from '@/lib/pro/filings-model'
import { loadFilings } from '@/lib/pro/filings-feed'
import { readViewer } from '@/lib/pro/viewer'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Filings',
  description: 'Recent FCC filings that mention satellites, with a link to the public record.',
}

export default async function FilingsPage({ searchParams }: { searchParams: Promise<{ company?: string; type?: string }> }) {
  const viewer = await readViewer()
  const query = await searchParams
  const board = await loadFilings()
  const filtered = filterFilings(board.rows, query)
  const rows = previewSlice(filtered, viewer.level, 3)
  const types = [...new Set(board.rows.map((row) => row.type))].sort()
  return (
    <main id="content" className="wrap page">
      <p className="kicker">Spectrum</p>
      <h1>Filings</h1>
      <p className="lede">Recent FCC filings whose text mentions a satellite, a space station, or an earth station. Each row links to the public document.</p>
      <p className="meta">Free during early access.</p>
      {board.notice ? <p className="note">{board.notice}</p> : null}
      <form className="pro-filters" method="get">
        <label className="pro-field">
          <span>Company</span>
          <input className="field" name="company" defaultValue={query.company ?? ''} placeholder="Filer name" />
        </label>
        <label className="pro-field">
          <span>Filing type</span>
          <select className="pro-select" name="type" defaultValue={query.type ?? ''}>
            <option value="">Any type</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <div className="pro-field">
          <span>Filter</span>
          <button className="btn" type="submit">
            Apply
          </button>
        </div>
      </form>
      <ul className="pro-cards">
        {rows.map((row) => (
          <li key={row.id} className="pro-card">
            <p className="kicker">{row.type}</p>
            <h2>
              <a href={row.url}>{row.filer}</a>
            </h2>
            <p>{row.title}</p>
            <p className="meta">
              {row.date || 'No public date yet'}
              {row.proceeding ? ` · ${row.proceeding}` : ''}
            </p>
          </li>
        ))}
      </ul>
      {rows.length === 0 ? <p className="note">No filing on this cut matches the filter.</p> : null}
    </main>
  )
}
