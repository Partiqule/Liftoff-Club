import type { Metadata } from 'next'
import { SkyFinder } from '@/components/sky-finder'

export const metadata: Metadata = {
  title: 'Sky finder',
  description: 'Point your phone at the sky. Names show satellites above the horizon and ones that rise in the next 30 minutes.',
}

export default function SkyFinderPage() {
  return (
    <main id="content">
      <SkyFinder />
    </main>
  )
}
