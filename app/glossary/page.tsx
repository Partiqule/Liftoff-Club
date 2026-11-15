import type { Metadata } from 'next'
import { SpaceWords } from '@/components/space-words'

export const metadata: Metadata = {
  title: 'Space words',
  description: 'Short definitions for the calls on a countdown, with a simpler line for kids mode.',
}

export default function GlossaryPage() {
  return (
    <main id="content" className="wrap page">
      <p className="kicker">A small dictionary</p>
      <h1>Space words</h1>
      <p className="lede">
        These are the calls you hear on a countdown. Tap one on a launch, a timeline, or launch day, and the card uses the kids line or the grown up line to match the switch in the corner. Words you open stay in this browser.
      </p>
      <SpaceWords />
    </main>
  )
}
