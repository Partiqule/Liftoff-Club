import type { Metadata } from 'next'
import Link from 'next/link'
import { previewSlice } from '@/lib/pro/access-gate'
import { VEHICLES, type VehicleCell } from '@/lib/pro/vehicles'
import { readViewer } from '@/lib/pro/viewer'

export const metadata: Metadata = {
  title: 'Vehicles',
  description: 'Published payload capacity and price lines for launch vehicles. A blank rate stays unpublished.',
}

export default async function VehiclesPage() {
  const viewer = await readViewer()
  const rows = previewSlice(VEHICLES, viewer.level, 2)
  return (
    <main id="content" className="wrap page">
      <p className="kicker">Capacity and price</p>
      <h1>Vehicles</h1>
      <p className="lede">Each figure is copied from a public page, with the link and the date we read it. If that page does not state the figure, the cell says not published.</p>
      <p className="meta">Free during early access.</p>
      <div className="pro-scroll">
        <table className="pro-table">
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Low Earth orbit</th>
              <th>Sun synchronous</th>
              <th>Geosynchronous transfer</th>
              <th>Published price</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <Link href={`/pro/company/${row.providerSlug}`}>{row.name}</Link>
                  <p className="meta">{row.provider}</p>
                </td>
                <td><Cell cell={row.leo} /></td>
                <td><Cell cell={row.sso} /></td>
                <td><Cell cell={row.gto} /></td>
                <td><Cell cell={row.price} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}

function Cell({ cell }: { cell: VehicleCell }) {
  if (cell.state === 'unpublished') return <p>Not published. <span className="meta">{cell.note}</span></p>
  return (
    <p>
      {cell.text}
      <span className="meta">
        {' '}
        <a href={cell.sourceUrl}>{cell.sourceTitle}</a>
        {' · as of '}
        {cell.asOf}. {cell.note}
      </span>
    </p>
  )
}
