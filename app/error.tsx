'use client'

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="content" className="wrap page">
      <p className="kicker">Static on the line</p>
      <h1>The board hiccuped.</h1>
      <p className="lede">Nothing of yours was lost. Your town stays on this device.</p>
      <button className="btn" type="button" onClick={() => reset()}>
        Try again
      </button>
    </main>
  )
}
