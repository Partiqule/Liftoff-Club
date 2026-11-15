import type { Metadata } from 'next'
import { SettingsPanel } from '@/components/settings-panel'
import { getLaunches } from '@/lib/launches'

export const metadata: Metadata = { title: 'House rules' }

export default async function SettingsPage() {
  const board = await getLaunches()
  const providers = [...new Set(board.launches.map((launch) => launch.provider.name))].sort((a, b) => a.localeCompare(b))
  return (
    <main id="content" className="wrap page">
      <p className="kicker">For the grown up in the room</p>
      <h1>House rules</h1>
      <p className="lede">Kids mode, a saved town, bedtime for alerts, and nothing that asks a child to make an account.</p>
      <SettingsPanel providers={providers} />
    </main>
  )
}
