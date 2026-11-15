import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'The brief',
  description: 'What is launching, and what is visible tonight. Shown on this screen, ready for a later note.',
}

export default function BriefLayout({ children }: { children: ReactNode }) {
  return children
}
