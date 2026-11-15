import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { MissionShell } from '@/components/mission-view'
import { getLaunch, getLaunches } from '@/lib/launches'

export const revalidate = 3600

export async function generateStaticParams() {
  const board = await getLaunches()
  return board.launches.map((launch) => ({ id: launch.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const launch = await getLaunch(id)
  return { title: launch ? `${launch.name} countdown` : 'Countdown' }
}

export default async function LaunchDayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const launch = await getLaunch(id)
  if (!launch) notFound()
  const asOf = launch.lastUpdated?.slice(0, 10) ?? null
  return <MissionShell launch={launch} asOf={asOf && /^\d{4}-\d{2}-\d{2}$/.test(asOf) ? asOf : null} />
}
