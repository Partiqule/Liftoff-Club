import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { PreviewBanner } from '@/components/pro/preview-banner'
import { ProShell } from '@/components/pro/shell'
import { readViewer } from '@/lib/pro/viewer'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: { default: 'Pro', template: '%s · Liftoff Club Pro' },
  description: 'Liftoff Club Pro is a desk for space industry teams who need launch, manifest, and constellation intel. Free during early access.',
}

export default async function ProLayout({ children }: { children: ReactNode }) {
  const viewer = await readViewer()
  return (
    <ProShell level={viewer.level} email={viewer.email}>
      <PreviewBanner level={viewer.level} email={viewer.email} />
      {children}
    </ProShell>
  )
}
