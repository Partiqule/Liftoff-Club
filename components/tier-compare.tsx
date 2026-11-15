import Link from 'next/link'
import { TIER_COPY } from '@/lib/tiers'

const TIERS = [
  {
    title: TIER_COPY.familyTitle,
    who: TIER_COPY.familyWho,
    offer: TIER_COPY.familyOffer,
    points: TIER_COPY.familyPoints,
    href: '/',
    link: 'Family site',
  },
  {
    title: TIER_COPY.proTitle,
    who: TIER_COPY.proWho,
    offer: TIER_COPY.proOffer,
    points: TIER_COPY.proPoints,
    href: '/pro',
    link: 'Open Pro',
  },
  {
    title: TIER_COPY.businessTitle,
    who: TIER_COPY.businessWho,
    offer: TIER_COPY.businessOffer,
    points: TIER_COPY.businessPoints,
    href: '/business',
    link: 'Open Business',
  },
] as const

export function TierCompare() {
  return (
    <section className="tier-compare">
      <p className="kicker">{TIER_COPY.kicker}</p>
      <div className="pro-personas">
        {TIERS.map((tier) => (
          <article key={tier.title} className="pro-card">
            <h2>{tier.title}</h2>
            <p>{tier.who}</p>
            <p className="meta">{tier.offer}</p>
            <ul>
              {tier.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <p className="pro-links">
              <Link href={tier.href}>{tier.link}</Link>
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
