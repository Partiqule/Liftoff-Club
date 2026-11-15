import type { Metadata } from 'next'
import Link from 'next/link'
import { DigestForm } from '@/components/pro/digest-form'
import { FREE_LINE, previewSlice } from '@/lib/pro/access-gate'
import { liveDigest } from '@/lib/pro/digest-live'
import { readViewer } from '@/lib/pro/viewer'
import type { DigestItem } from '@/lib/pro/digest-model'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Digest',
  description: 'A Monday note of launches, tests, slips, and filings. Free during early access.',
}

export default async function DigestPage() {
  const viewer = await readViewer()
  const issue = await liveDigest()
  return (
    <main id="content" className="wrap page">
      <p className="kicker">Monday note</p>
      <h1>Digest</h1>
      <p className="lede">{issue.windowLabel} The mail goes out Monday at 7 in the morning, Mountain Time, after you confirm.</p>
      <p className="meta">{FREE_LINE}</p>
      <Section title="Launches" items={previewSlice(issue.launches, viewer.level, 2)} />
      <Section title="Tests" items={previewSlice(issue.tests, viewer.level, 2)} />
      <Section title="Slips" items={previewSlice(issue.slips, viewer.level, 2)} />
      <Section title="Filings" items={previewSlice(issue.filings, viewer.level, 2)} />
      {viewer.level === 'full' ? <DigestForm /> : <p className="note">The confirm form opens after you sign in. {FREE_LINE}</p>}
      <p>
        <Link href="/pro">Back to the desk</Link>
      </p>
    </main>
  )
}

function Section({ title, items }: { title: string; items: DigestItem[] }) {
  return (
    <section>
      <h2>{title}</h2>
      {items.length === 0 ? <p className="note">None on the public list for this window.</p> : null}
      <ul>
        {items.map((item) => (
          <li key={`${title}-${item.title}`}>
            {item.href.startsWith('/') ? <Link href={item.href}>{item.title}</Link> : <a href={item.href}>{item.title}</a>}
            <span className="meta"> {item.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
