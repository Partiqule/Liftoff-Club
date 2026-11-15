import type { Metadata } from 'next'
import { GovDesk } from '@/components/pro/gov-desk'
import { SPACE_NAICS } from '@/lib/pro/gov'
import { loadGovBoard } from '@/lib/pro/gov-feed'

export const revalidate = 21600

export const metadata: Metadata = {
  title: 'Gov',
  description: 'Recent public space contract awards from USAspending.',
}

export default async function GovPage() {
  const board = await loadGovBoard()
  return (
    <main id="content" className="wrap page">
      <p className="kicker">Public records</p>
      <h1>Gov</h1>
      <p className="lede">
        Past federal contract awards in space NAICS codes. Figures come from USAspending. A blank amount means the feed did not publish one.
      </p>
      <ul>
        {SPACE_NAICS.map((code) => (
          <li key={code.code}>
            {code.code} {code.title}
            {code.keywordGate ? ' Kept only when the award text says launch, satellite, spacecraft, ground station, space vehicle, or spaceport.' : ''}
          </li>
        ))}
      </ul>
      <GovDesk awards={board.awards} fetchedAt={board.fetchedAt} />
    </main>
  )
}
