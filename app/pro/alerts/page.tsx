import type { Metadata } from 'next'
import { AlertDesk } from '@/components/pro/alert-desk'
import { loadProBoard } from '@/lib/pro/load'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Alerts',
  description: 'Local rules for a new launch date, a moved clock, or a new constellation flight, plus a calendar feed.',
}

export default async function AlertsPage() {
  const { board, refs, now } = await loadProBoard()
  return (
    <main id="content" className="wrap page">
      <p className="kicker">Rules in this browser</p>
      <h1>Alerts</h1>
      <p className="lede">
        Turn on a rule for a new launch date, a clock that moves, or a new constellation flight. The feed stays in this browser. The calendar covers the targets you saved.
      </p>
      <AlertDesk launches={board.launches} constellations={refs} now={now} />
    </main>
  )
}
