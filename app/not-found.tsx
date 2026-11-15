import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Not on the map',
  description: 'That address is not a page in Liftoff Club.',
}

export default function NotFound() {
  return (
    <main id="content" className="wrap page">
      <p className="kicker">Off the map</p>
      <h1>That page is not in the sky.</h1>
      <p className="lede">The address may be old, or the launch has already left the board.</p>
      <div className="hero-actions">
        <Link className="btn" href="/">
          Back to tonight
        </Link>
        <Link className="btn btn-quiet" href="/launches">
          See the launches
        </Link>
      </div>
    </main>
  )
}
