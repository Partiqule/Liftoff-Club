import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LocalTime } from '@/components/local-time'
import { companyPage, companiesOnBoard } from '@/lib/company-board'
import { listCatalog } from '@/lib/companies'
import { getLaunches } from '@/lib/launches'

export const revalidate = 3600

const ROLE_WORDS: Record<string, string> = {
  provider: 'flying the rocket',
  payload: 'on board',
  customer: 'the customer',
  spacecraft: 'the ship',
}

export async function generateStaticParams() {
  const board = await getLaunches()
  const slugs = new Set<string>([...listCatalog().map((company) => company.slug), ...companiesOnBoard(board.launches).map((company) => company.slug)])
  return [...slugs].map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const board = await getLaunches()
  const page = companyPage(slug, board.launches)
  if (!page) return { title: 'Company' }
  return {
    title: page.company.name,
    description: page.company.brief,
  }
}

export default async function CompanyProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const board = await getLaunches()
  const page = companyPage(slug, board.launches)
  if (!page) notFound()
  const { company, flights } = page
  return (
    <main id="content" className="wrap page">
      <p className="kicker">Public profile · unclaimed</p>
      <h1>{company.name}</h1>
      <p className="story when-kid">{company.kid}</p>
      <p className="story when-adult">{company.brief}</p>
      <div className="job-links">
        {company.careersUrl ? (
          <a href={company.careersUrl} rel="noreferrer">
            Careers
          </a>
        ) : (
          <span className="meta">No public careers page on file</span>
        )}
        {company.siteUrl ? (
          <a href={company.siteUrl} rel="noreferrer">
            Company site
          </a>
        ) : null}
      </div>
      <p className="note when-adult">
        This page is assembled from public launch listings. It has no owner and no login. The family app does not record who looked at it beyond an anonymous page count, and only if the site is deployed with that turned on.
      </p>
      <section>
        <h2>On the board now</h2>
        {flights.length === 0 ? <p className="note">No upcoming launch in the current board names {company.name}.</p> : null}
        <ul className="jobs">
          {flights.map((flight) => (
            <li key={flight.launchId}>
              <h3>
                <Link href={`/launches/${flight.launchId}`}>{flight.launchName}</Link>
              </h3>
              <p className="meta">
                {flight.roles.map((role) => ROLE_WORDS[role] ?? role).join(' · ')}
                {flight.net ? (
                  <>
                    {' · '}
                    <LocalTime iso={flight.net} />
                  </>
                ) : null}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
