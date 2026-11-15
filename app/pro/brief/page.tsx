import type { Metadata } from 'next'
import Link from 'next/link'
import { companiesOnBoard } from '@/lib/company-board'
import { CONSTELLATIONS } from '@/lib/constellation-data'
import { loadProBoard } from '@/lib/pro/load'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Brief',
  description: 'A printable one page brief for a company or a constellation, with a talk track from sourced facts.',
}

export default async function BriefIndex() {
  const { board } = await loadProBoard()
  const companies = companiesOnBoard(board.launches).sort((a, b) => a.name.localeCompare(b.name))
  return (
    <main id="content" className="wrap page">
      <p className="kicker">One page brief</p>
      <h1>Brief</h1>
      <p className="lede">Pick a constellation or a company on the board. The page lists sourced figures, leaves the rest blank, and writes a talk track from those lines only.</p>
      <h2>Constellations</h2>
      <ul className="pro-index">
        {CONSTELLATIONS.map((item) => (
          <li key={item.id}>
            <Link href={`/pro/brief/constellation/${item.id}`}>{item.name}</Link>
            <span className="meta"> · {item.operator}</span>
          </li>
        ))}
      </ul>
      <h2>Companies on the board</h2>
      <ul className="pro-index">
        {companies.map((company) => (
          <li key={company.slug}>
            <Link href={`/pro/brief/company/${company.slug}`}>{company.name}</Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
