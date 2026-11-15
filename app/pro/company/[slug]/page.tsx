import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { companiesOnBoard } from '@/lib/company-board'
import { getCatalogCompany } from '@/lib/companies'
import { eventsForCompany, getEvents } from '@/lib/events'
import { getLaunches } from '@/lib/launches'
import { previewSlice } from '@/lib/pro/access-gate'
import { awardsForCompany } from '@/lib/pro/awards-feed'
import { loadFilings } from '@/lib/pro/filings-feed'
import { mergeTimeline, type TimelineItem } from '@/lib/pro/timeline'
import { readViewer } from '@/lib/pro/viewer'
import { launchMatchesCompany } from '@/lib/business/review'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const company = getCatalogCompany(slug)
  return { title: company ? `${company.name} timeline` : 'Company timeline' }
}

export default async function CompanyTimelinePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const viewer = await readViewer()
  const board = await getLaunches()
  const company = getCatalogCompany(slug) ?? companiesOnBoard(board.launches).find((item) => item.slug === slug) ?? null
  if (!company) notFound()
  const events = await getEvents()
  const filings = await loadFilings()
  const awards = viewer.level === 'full' ? await awardsForCompany(company.name) : []
  const names = new Set([company.name.toLowerCase()])
  const launches = board.launches.filter((launch) => launchMatchesCompany(launch, slug))
  const items = mergeTimeline([
    launches.map((launch) => ({
      id: `launch-${launch.id}`,
      at: launch.net,
      kind: 'launch' as const,
      title: launch.name,
      detail: launch.net ? 'On the public board.' : 'Clock not set.',
      href: `/launches/${launch.id}`,
    })),
    eventsForCompany(events.events, slug).map((event) => ({
      id: `event-${event.id}`,
      at: event.when,
      kind: 'event' as const,
      title: event.name,
      detail: event.type,
      href: event.infoUrl ?? event.sourceUrl,
    })),
    awards.map((award) => ({
      id: `award-${award.id}`,
      at: award.date || null,
      kind: 'award' as const,
      title: award.recipient,
      detail: `${award.amount} · ${award.agency}`,
      href: award.url,
    })),
    filings.rows
      .filter((row) => names.has(row.filer.toLowerCase()) || row.filer.toLowerCase().includes(company.name.toLowerCase()))
      .map((row) => ({
        id: `filing-${row.id}`,
        at: row.date || null,
        kind: 'filing' as const,
        title: row.filer,
        detail: row.type,
        href: row.url,
      })),
  ])
  const shown = previewSlice(items, viewer.level, 4)
  return (
    <main id="content" className="wrap page">
      <p className="kicker">Timeline</p>
      <h1>{company.name}</h1>
      <p className="lede">{company.brief}</p>
      <p className="meta">Newest first. Free during early access.</p>
      <ul className="pro-cards">
        {shown.map((item) => (
          <li key={item.id} className="pro-card">
            <p className="kicker">{label(item.kind)}</p>
            <h2>
              <ItemLink item={item} />
            </h2>
            <p>{item.detail}</p>
            <p className="meta">{item.at ? item.at.slice(0, 10) : 'No public date yet'}</p>
          </li>
        ))}
      </ul>
      {shown.length === 0 ? <p className="note">No public launch, test, award, or filing is tied to this company yet.</p> : null}
      <p>
        <Link href={`/companies/${company.slug}`}>Family profile</Link>
      </p>
    </main>
  )
}

function ItemLink({ item }: { item: TimelineItem }) {
  if (item.href.startsWith('/')) return <Link href={item.href}>{item.title}</Link>
  return <a href={item.href}>{item.title}</a>
}

function label(kind: TimelineItem['kind']): string {
  if (kind === 'launch') return 'Launch'
  if (kind === 'event') return 'Test or event'
  if (kind === 'award') return 'Award'
  return 'Filing'
}
