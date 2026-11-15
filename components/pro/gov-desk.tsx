'use client'

import { useMemo, useState } from 'react'
import { filterAwards, type Award } from '@/lib/pro/gov'

export function GovDesk({ awards, fetchedAt }: { awards: Award[]; fetchedAt: string }) {
  const [agency, setAgency] = useState('')
  const [keyword, setKeyword] = useState('')
  const [range, setRange] = useState<'' | '365' | '90'>('')
  const [sort, setSort] = useState<'newest' | 'amount'>('newest')
  const agencies = useMemo(() => [...new Set(awards.map((row) => row.agency))].sort(), [awards])
  const rows = filterAwards(awards, { agency, keyword, range, sort })

  return (
    <>
      <form className="pro-filters" onSubmit={(event) => event.preventDefault()}>
        <label>
          Agency
          <select className="pro-select" value={agency} onChange={(event) => setAgency(event.target.value)}>
            <option value="">All agencies</option>
            {agencies.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          When
          <select className="pro-select" value={range} onChange={(event) => setRange(event.target.value as '' | '365' | '90')}>
            <option value="">Past two years</option>
            <option value="365">Past year</option>
            <option value="90">Past 90 days</option>
          </select>
        </label>
        <label>
          Sort
          <select className="pro-select" value={sort} onChange={(event) => setSort(event.target.value as 'newest' | 'amount')}>
            <option value="newest">Newest first</option>
            <option value="amount">Largest amount</option>
          </select>
        </label>
        <label>
          Keyword
          <input className="field" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="satellite, launch, recipient" />
        </label>
      </form>
      <h2>Past awards</h2>
      <p className="meta">USAspending.gov. Amounts are the published award amounts. Dates are the published start dates. As of {fetchedAt.slice(0, 10)}.</p>
      {rows.length === 0 ? <p className="lede">No public award matches these filters.</p> : null}
      <ul className="pro-cards">
        {rows.map((row) => (
          <li key={`${row.naics}-${row.id}`} className="pro-card">
            <h3>
              <a href={row.url}>{row.recipient}</a>
            </h3>
            <dl className="pro-facts">
              <div>
                <dt>Amount</dt>
                <dd>{row.amountLabel}</dd>
              </div>
              <div>
                <dt>Date</dt>
                <dd>{row.dateLabel}</dd>
              </div>
              <div>
                <dt>Agency</dt>
                <dd>{row.agency}</dd>
              </div>
              <div>
                <dt>NAICS</dt>
                <dd>{row.naics}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </>
  )
}
