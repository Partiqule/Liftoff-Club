import type { Metadata } from 'next'
import Link from 'next/link'
import { PRIVACY, PRIVACY_EMAIL } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'What Liftoff Club stores, who handles it, and how to ask for a deletion.',
}

export default function PrivacyPage() {
  return (
    <main id="content" className="wrap page">
      <p className="kicker">Plain language</p>
      <h1>{PRIVACY.title}</h1>
      <p className="lede">{PRIVACY.lede}</p>
      <section>
        <h2>{PRIVACY.kidsTitle}</h2>
        <p>{PRIVACY.kids}</p>
      </section>
      <section>
        <h2>{PRIVACY.collectTitle}</h2>
        <ul>
          {PRIVACY.collect.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
      <section>
        <h2>{PRIVACY.processorsTitle}</h2>
        <p>{PRIVACY.processors}</p>
        <p className="meta">
          <a href="https://vercel.com">Vercel</a>
          {' · '}
          <a href="https://upstash.com">Upstash</a>
          {' · '}
          <a href="https://resend.com">Resend</a>
        </p>
      </section>
      <section>
        <h2>{PRIVACY.retentionTitle}</h2>
        <p>{PRIVACY.retention}</p>
      </section>
      <section>
        <h2>{PRIVACY.deleteTitle}</h2>
        <p>
          {PRIVACY.delete} <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>
        </p>
      </section>
      <p className="meta">
        <Link href="/support">Support</Link>
      </p>
    </main>
  )
}
