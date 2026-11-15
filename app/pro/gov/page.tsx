import type { Metadata } from 'next'
import { GovDesk } from '@/components/pro/gov-desk'
import { SPACE_NAICS } from '@/lib/pro/gov'
import { loadGovBoard } from '@/lib/pro/gov-feed'

export const revalidate = 21600

export const metadata: Metadata = {
  title: 'Gov',
  description: 'Public space solicitations from SAM.gov and recent awards from USAspending.',
}

export default async function GovPage() {
  const board = await loadGovBoard()
  return (
    <main id="content" className="wrap page">
      <p className="kicker">Public records</p>
      <h1>Gov</h1>
      <p className="lede">
        Open federal notices and recent contract awards in space NAICS codes. Figures come from SAM.gov and USAspending. A blank line means the feed did not publish that field.
      </p>
      <ul>
        {SPACE_NAICS.map((code) => (
          <li key={code.code}>
            {code.code} {code.title}
            {code.keywordGate ? ' Kept only when the notice says launch, satellite, spacecraft, ground station, space vehicle, or spaceport.' : ''}
          </li>
        ))}
      </ul>
      <GovDesk opportunities={board.opportunities} awards={board.awards} notice={board.notice} fetchedAt={board.fetchedAt} />
    </main>
  )
}
