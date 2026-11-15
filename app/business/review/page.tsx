import type { Metadata } from 'next'
import Link from 'next/link'
import { ReviewForm } from '@/components/business/review-form'
import { ReviewSheet } from '@/components/business/review-sheet'
import { companiesOnBoard } from '@/lib/company-board'
import { pastFlightsFor } from '@/lib/business/past-flights'
import { buildReview, deploymentFromCells, exampleReview, launchMatchesCompany, type Quarter } from '@/lib/business/review'
import { loadProBoard } from '@/lib/pro/load'
import { constellationRefs } from '@/lib/pro/options'
import { readViewer } from '@/lib/pro/viewer'
import { BUSINESS_COPY } from '@/lib/tiers'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Quarterly review',
  description: BUSINESS_COPY.reviewBody,
}

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; year?: string; quarter?: string; launches?: string }>
}) {
  const viewer = await readViewer()
  const query = await searchParams
  const open = viewer.level === 'full'
  if (!open) {
    return (
      <main id="content" className="wrap page">
        <p className="kicker">Business</p>
        <h1>{BUSINESS_COPY.reviewTitle}</h1>
        <p className="lede">{BUSINESS_COPY.reviewBody}</p>
        <p className="meta">{BUSINESS_COPY.offer}</p>
        <p className="note">
          The full review opens after you sign in. Free during early access. <Link href="/business#access">Request business access</Link> or <Link href="/pro#access">request Pro access</Link>.
        </p>
        <ReviewSheet review={exampleReview()} />
      </main>
    )
  }
  const { board, rows, day, now } = await loadProBoard()
  const companies = companiesOnBoard(board.launches)
    .map((company) => ({ slug: company.slug, name: company.name }))
    .sort((a, b) => a.name.localeCompare(b.name))
  const clock = new Date(now)
  const year = numberIn(query.year, 2020, 2035) ?? clock.getUTCFullYear()
  const quarter = (numberIn(query.quarter, 1, 4) ?? (Math.floor(clock.getUTCMonth() / 3) + 1)) as Quarter
  const selected = companies.find((company) => company.slug === query.company) ?? null
  const pickedIds = new Set((query.launches ?? '').split(',').map((id) => id.trim()).filter(Boolean))
  let review = exampleReview(day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : '2026-11-15')
  if (selected || pickedIds.size > 0) {
    const matched = board.launches.filter((launch) => {
      if (pickedIds.has(launch.id)) return true
      return selected ? launchMatchesCompany(launch, selected.slug) : false
    })
    let historyGap: string | null = null
    let past = matched
    if (selected) {
      const rangeStart = Date.UTC(year, (quarter - 1) * 3, 1)
      const rangeEnd = Date.UTC(year, quarter * 3, 1) - 1
      const history = await pastFlightsFor(selected.name, rangeStart, rangeEnd)
      historyGap = history.notice
      const seen = new Map(matched.map((launch) => [launch.id, launch]))
      for (const launch of history.launches) {
        if (launchMatchesCompany(launch, selected.slug)) seen.set(launch.id, launch)
      }
      past = [...seen.values()]
    }
    const deployment = rows
      .filter((row) => selected && row.companySlug === selected.slug)
      .map((row) => deploymentFromCells(row.name, row.inOrbit, row.authorized))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
    review = buildReview({
      title: selected?.name ?? 'Saved launches',
      year,
      quarter,
      launches: past,
      asOf: day,
      deployment,
      historyGap,
    })
  }
  return (
    <main id="content" className="wrap page">
      <p className="kicker">Business</p>
      <h1>{BUSINESS_COPY.reviewTitle}</h1>
      <p className="lede">{BUSINESS_COPY.reviewBody}</p>
      <p className="meta">{BUSINESS_COPY.offer}</p>
      <ReviewForm companies={companies} launches={board.launches} constellations={constellationRefs()} year={year} quarter={quarter} now={now} />
      <ReviewSheet review={review} />
    </main>
  )
}

function numberIn(value: string | undefined, min: number, max: number): number | null {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return null
  return parsed
}
