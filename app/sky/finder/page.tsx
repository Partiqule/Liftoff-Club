import type { Metadata } from 'next'
import { SkyFinder } from '@/components/sky-finder'
import { getSkyCatalog } from '@/lib/sky-catalog'

export const revalidate = 600

export const metadata: Metadata = {
  title: 'Sky finder',
  description: 'Point your phone at the sky. Names show satellites above the horizon and ones that rise in the next 30 minutes.',
}

export default async function SkyFinderPage() {
  const catalog = await getSkyCatalog()
  return (
    <main id="content">
      <SkyFinder initialCatalog={{ objects: catalog.objects, notice: catalog.notice }} />
    </main>
  )
}
