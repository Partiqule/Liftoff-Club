import { HomeLive } from '@/components/home-live'
import { TierCompare } from '@/components/tier-compare'
import { SourceNote } from '@/components/source-note'
import { Tonight } from '@/components/tonight'
import { toHomeCard } from '@/lib/home-card'
import { getLaunches } from '@/lib/launches'
import { homeCandidates } from '@/lib/schedule'

export const revalidate = 300

export default async function HomePage() {
  const board = await getLaunches()
  const candidates = homeCandidates(board.launches).map(toHomeCard)
  return (
    <main id="content">
      <HomeLive launches={candidates} middle={<Tonight />} note={<SourceNote board={board} />} footer={<TierCompare />} />
    </main>
  )
}
