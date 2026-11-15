import type { Metadata } from 'next'
import { SkyBoard } from '@/components/sky-board'

export const metadata: Metadata = {
  title: 'Tonight’s sky',
  description: 'ISS and a sample of Starlink passes for your town, with a go or no go for clouds.',
}

export default function SkyPage() {
  return (
    <main id="content">
      <SkyBoard />
    </main>
  )
}
