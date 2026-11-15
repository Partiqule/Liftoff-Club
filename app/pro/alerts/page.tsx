import type { Metadata } from 'next'
import { AlertDesk } from '@/components/pro/alert-desk'
import { loadProBoard } from '@/lib/pro/load'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Alerts',
  description: 'Local rules for company launches, scrubs, slips, and new manifest names, plus a calendar feed.',
}

export default async function AlertsPage() {
  const { board, refs, now } = await loadProBoard()
  return (
    <main id="content" className="wrap page">
      <p className="kicker">Rules in this browser</p>
      <h1>Alerts</h1>
      <p className="lede">
        Build a rule for company launches, a scrub or a slip, or a new manifest name. The match list uses the public board. The calendar feed covers the targets you saved.
      </p>
      <AlertDesk launches={board.launches} constellations={refs} now={now} />
    </main>
  )
}
