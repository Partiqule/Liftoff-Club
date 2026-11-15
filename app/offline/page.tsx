import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Offline',
  description: 'Liftoff Club needs a connection for live launch times.',
}

export default function OfflinePage() {
  return (
    <main id="content" className="wrap page">
      <p className="kicker">No connection</p>
      <h1>The sky is still there</h1>
      <p className="lede">Live launch times need a connection. Open Liftoff Club again when you are back online. Saved settings stay on this device.</p>
      <p>
        <Link className="btn" href="/">
          Try again
        </Link>
      </p>
    </main>
  )
}
