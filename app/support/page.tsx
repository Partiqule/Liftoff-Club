import type { Metadata } from 'next'
import Link from 'next/link'
import { PRIVACY_EMAIL, SUPPORT } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Support',
  description: 'How to ask Liftoff Club a question or request a deletion.',
}

export default function SupportPage() {
  return (
    <main id="content" className="wrap page">
      <p className="kicker">Help</p>
      <h1>{SUPPORT.title}</h1>
      <p className="lede">{SUPPORT.lede}</p>
      <p>
        <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>
      </p>
      <p>{SUPPORT.body}</p>
      <p className="meta">
        <Link href="/privacy">Privacy</Link>
      </p>
    </main>
  )
}
