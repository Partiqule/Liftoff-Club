import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { ProShell } from '@/components/pro/shell'

export const metadata: Metadata = {
  title: { default: 'Pro', template: '%s · Liftoff Club Pro' },
  description: 'Liftoff Club Pro is a desk for space industry teams who need launch, manifest, and constellation intel.',
}

export default function ProLayout({ children }: { children: ReactNode }) {
  return <ProShell>{children}</ProShell>
}
