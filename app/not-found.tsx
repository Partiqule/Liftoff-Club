import Link from 'next/link'

export default function NotFound() {
  return (
    <main id="content" className="wrap page">
      <p className="kicker">Off the board</p>
      <h1>That launch is not on the list.</h1>
      <p className="lede">It may have flown, or the id is from an older copy of the feed.</p>
      <Link className="btn" href="/launches">
        See upcoming launches
      </Link>
    </main>
  )
}
