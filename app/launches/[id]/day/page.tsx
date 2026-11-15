import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LaunchDayScreen } from '@/components/launch-day'
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
  return <LaunchDayScreen launch={launch} />
}
