import Link from 'next/link'
import { SKY_COPY } from '@/lib/sky-point'

export function SkyFinderCard() {
  return (
    <aside className="finder-card">
      <p className="kicker">{SKY_COPY.cardKicker}</p>
      <h2>{SKY_COPY.cardTitle}</h2>
      <p className="lede">{SKY_COPY.cardLede}</p>
      <p className="hero-actions">
        <Link className="btn" href="/sky/finder" prefetch={false}>
          {SKY_COPY.cardAction}
        </Link>
      </p>
    </aside>
  )
}
