import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BriefView } from '@/components/pro/brief-view'
import { CONSTELLATIONS } from '@/lib/constellation-data'
import { constellationBrief } from '@/lib/pro/brief'
import { loadProBoard } from '@/lib/pro/load'
import { maybeRewriteTalk } from '@/lib/pro/talk-model'

export const revalidate = 3600

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const profile = CONSTELLATIONS.find((item) => item.id === id)
  return { title: profile ? `${profile.name} brief` : 'Brief' }
}

export default async function ConstellationBriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = CONSTELLATIONS.find((item) => item.id === id)
  if (!profile) notFound()
  const { board, sources, day, now } = await loadProBoard()
  const source = sources.find((item) => item.id === id)
  if (!source) notFound()
  const brief = constellationBrief(source, board.launches, day, now)
  const talk = await maybeRewriteTalk(brief.facts, brief.talk)
  return (
    <main id="content" className="wrap page">
      <BriefView brief={brief} talk={talk.lines} source={talk.source} />
    </main>
  )
}
