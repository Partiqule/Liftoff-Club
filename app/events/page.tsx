import type { Metadata } from 'next'
import { EventFeed } from '@/components/event-feed'
import { getEvents } from '@/lib/events'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Tests and events',
  description: 'Static fires, rehearsals, landings, dockings, and spacewalks from the public launch library.',
}

export default async function EventsPage() {
  const board = await getEvents()
  return (
    <main id="content" className="wrap page">
      <p className="kicker">Not a launch unless the type says so</p>
      <h1>Tests and events</h1>
      <p className="lede when-kid">Things that happen around a rocket besides the launch. Each one comes from a public list.</p>
      <p className="lede when-adult">
        Static fires, wet dress rehearsals, rollouts, landings, dockings, and spacewalks from Launch Library 2. The words in kids mode explain the type. The longer note is the public description, when one was published.
      </p>
      <EventFeed events={board.events} refreshedAt={board.fetchedAt} notice={board.notice} />
    </main>
  )
}
