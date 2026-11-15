import type { Metadata } from 'next'
import Link from 'next/link'
import { AccessForm } from '@/components/pro/access-form'
import { TrackerTable } from '@/components/pro/tracker-table'
import { PRO_COPY } from '@/lib/pro/copy'
import { loadProBoard } from '@/lib/pro/load'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Pro',
  description: PRO_COPY.lede,
}

export default async function ProHome() {
  const { rows } = await loadProBoard()
  return (
    <main id="content" className="wrap page pro-home">
      <p className="kicker">Industry desk</p>
      <h1>{PRO_COPY.title}</h1>
      <p className="lede">{PRO_COPY.lede}</p>
      <p className="meta">{PRO_COPY.pricing}</p>
      <div className="pro-personas">
        <section className="pro-card">
          <h2>{PRO_COPY.companyTitle}</h2>
          <p>{PRO_COPY.companyBody}</p>
          <ul>
            {PRO_COPY.companyPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <p className="pro-links">
            <Link href="/pro/tracker">Tracker</Link>
            <Link href="/pro/manifest">Manifest</Link>
            <Link href="/pro/brief">Brief</Link>
          </p>
        </section>
        <section className="pro-card">
          <h2>{PRO_COPY.salesTitle}</h2>
          <p>{PRO_COPY.salesBody}</p>
          <ul>
            {PRO_COPY.salesPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <p className="pro-links">
            <Link href="/pro/brief">Talk track</Link>
            <Link href="/pro/alerts">Alerts</Link>
            <Link href="/pro/watchlist">Watchlist</Link>
          </p>
        </section>
      </div>
      <h2>Sample of the tracker</h2>
      <p className="lede">These rows are the live public records. A blank cell means we do not have a sourced figure. A brief is a one page sheet you choose from the list.</p>
      <TrackerTable rows={rows} />
      <p>
        <Link href="/pro/tracker">Open the full tracker</Link>
      </p>
      <h2>{PRO_COPY.accessTitle}</h2>
      <p>{PRO_COPY.accessBody}</p>
      <p className="meta">{PRO_COPY.pricing}</p>
      <AccessForm />
      <p className="note">{PRO_COPY.savedBody}</p>
    </main>
  )
}
