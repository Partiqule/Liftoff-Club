'use client'

import { useMemo, useState } from 'react'
import { filterOpportunities, type Award, type Opportunity } from '@/lib/pro/gov'

export function GovDesk({
  opportunities,
  awards,
  notice,
  fetchedAt,
}: {
  opportunities: Opportunity[]
  awards: Award[]
  notice: string | null
  fetchedAt: string
}) {
  const [agency, setAgency] = useState('')
  const [noticeType, setNoticeType] = useState('')
  const [deadline, setDeadline] = useState('')
  const [keyword, setKeyword] = useState('')
  const agencies = useMemo(() => [...new Set(opportunities.map((row) => row.agency))].sort(), [opportunities])
  const types = useMemo(() => [...new Set(opportunities.map((row) => row.noticeType))].sort(), [opportunities])
  const rows = filterOpportunities(opportunities, { agency, noticeType, deadline, keyword })

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
          Notice type
          <select className="pro-select" value={noticeType} onChange={(event) => setNoticeType(event.target.value)}>
            <option value="">All types</option>
            {types.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Deadline
          <select className="pro-select" value={deadline} onChange={(event) => setDeadline(event.target.value)}>
            <option value="">Any deadline</option>
            <option value="open">Still open</option>
            <option value="30">Due within 30 days</option>
          </select>
        </label>
        <label>
          Keyword
          <input className="field" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="launch, satellite, ground station" />
        </label>
      </form>
      {notice ? <p className="note">{notice}</p> : null}
      <h2>Open notices</h2>
      <p className="meta">SAM.gov. Posted dates without a clock stay as dates. Deadlines with a clock are Mountain Time. As of {fetchedAt.slice(0, 10)}.</p>
      {rows.length === 0 ? <p className="lede">No public notice matches these filters.</p> : null}
      <ul className="pro-cards">
        {rows.map((row) => (
          <li key={row.id} className="pro-card">
            <p className="kicker">{row.noticeType}</p>
            <h3>
              <a href={row.url}>{row.title}</a>
            </h3>
            <dl className="pro-facts">
              <div>
                <dt>Agency</dt>
                <dd>{row.agency}</dd>
              </div>
              <div>
                <dt>Posted</dt>
                <dd>{row.postedLabel}</dd>
              </div>
              <div>
                <dt>Response deadline</dt>
                <dd>{row.deadlineLabel}</dd>
              </div>
              <div>
                <dt>Set aside</dt>
                <dd>{row.setAside}</dd>
              </div>
              <div>
                <dt>NAICS</dt>
                <dd>{row.naics}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
      <h2>Recent awards</h2>
      <p className="meta">USAspending.gov. Amounts are the published award amounts. Dates are the published start dates.</p>
      {awards.length === 0 ? <p className="lede">No public award came back for these codes and agencies.</p> : null}
      <ul className="pro-cards">
        {awards.map((row) => (
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
