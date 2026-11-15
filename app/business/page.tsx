import type { Metadata } from 'next'
import Link from 'next/link'
import { AccessForm } from '@/components/pro/access-form'
import { TierCompare } from '@/components/tier-compare'
import { BUSINESS_COPY } from '@/lib/tiers'

export const metadata: Metadata = {
  title: 'Business',
  description: BUSINESS_COPY.lede,
}

export default function BusinessPage() {
  return (
    <main id="content" className="wrap page">
      <p className="kicker">For a team</p>
      <h1>{BUSINESS_COPY.title}</h1>
      <p className="lede">{BUSINESS_COPY.lede}</p>
      <p className="meta">{BUSINESS_COPY.offer}</p>
      <p>
        <Link className="btn" href="/business/review">
          Open the quarterly review
        </Link>
      </p>
      <h2>{BUSINESS_COPY.reviewTitle}</h2>
      <p>{BUSINESS_COPY.reviewBody}</p>
      <h2>{BUSINESS_COPY.comingTitle}</h2>
      <ul>
        {BUSINESS_COPY.coming.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <TierCompare />
      <h2 id="access">{BUSINESS_COPY.accessTitle}</h2>
      <p>{BUSINESS_COPY.accessBody}</p>
      <p className="meta">{BUSINESS_COPY.offer}</p>
      <AccessForm tier="business" />
    </main>
  )
}
