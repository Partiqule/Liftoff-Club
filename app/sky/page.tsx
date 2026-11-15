import type { Metadata } from 'next'
import { SkyBoard } from '@/components/sky-board'

export const metadata: Metadata = {
  title: 'Tonight’s sky',
  description: 'The space station and a sample of Starlink passes for your town, and whether the clouds will hide them.',
}

export default function SkyPage() {
  return (
    <main id="content">
      <SkyBoard />
    </main>
  )
}
