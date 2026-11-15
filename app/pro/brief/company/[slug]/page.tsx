import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BriefView } from '@/components/pro/brief-view'
import { companiesOnBoard } from '@/lib/company-board'
import { getCatalogCompany } from '@/lib/companies'
import { companyBrief } from '@/lib/pro/brief'
import { loadProBoard } from '@/lib/pro/load'
import { maybeRewriteTalk } from '@/lib/pro/talk-model'

export const revalidate = 3600

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const company = getCatalogCompany(slug)
  return { title: company ? `${company.name} brief` : 'Brief' }
}

export default async function CompanyBriefPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { board, sources, day, now, history } = await loadProBoard()
  const company = getCatalogCompany(slug) ?? companiesOnBoard(board.launches).find((item) => item.slug === slug) ?? null
  if (!company) notFound()
  const related = sources.filter((item) => item.companySlug === slug)
  const brief = companyBrief(company.name, slug, related, board.launches, day, now, history)
  const talk = await maybeRewriteTalk(brief.facts, brief.talk)
  return (
    <main id="content" className="wrap page">
      <BriefView brief={brief} talk={talk.lines} source={talk.source} />
    </main>
  )
}
