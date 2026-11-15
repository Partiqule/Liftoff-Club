import type { Metadata } from 'next'
import Link from 'next/link'
import { companiesOnBoard } from '@/lib/company-board'
import { getLaunches } from '@/lib/launches'

export const metadata: Metadata = {
  title: 'Companies on the board',
  description: 'The companies named on upcoming launches, in plain words.',
}

export const revalidate = 3600

export default async function CompaniesPage() {
  const board = await getLaunches()
  const companies = companiesOnBoard(board.launches)
  return (
    <main id="content" className="wrap page">
      <p className="kicker">Space jobs corner</p>
      <h1>Names on the board</h1>
      <p className="lede when-kid">These are the companies flying rockets or riding on them soon. Tap a name to read what they do.</p>
      <p className="lede when-adult">
        Each name is a public profile with a stable id. Nobody has claimed one. There is no company login on this site.
      </p>
      <ul className="jobs">
        {companies.map((company) => (
          <li key={company.id}>
            <h3>
              <Link href={`/companies/${company.slug}`}>{company.name}</Link>
            </h3>
            <p className="when-kid">{company.kid}</p>
            <p className="when-adult">{company.brief}</p>
          </li>
        ))}
      </ul>
    </main>
  )
}
