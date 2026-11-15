'use client'

import Link from 'next/link'
import { FREE_LINE, type AccessLevel } from '@/lib/pro/access-gate'
import { openAccessDialog } from '@/components/pro/open-access'

export function PreviewBanner({ level, email }: { level: AccessLevel; email: string | null }) {
  if (level === 'full') {
    return (
      <p className="wrap meta">
        Signed in{email ? ` as ${email}` : ''}. {FREE_LINE}
      </p>
    )
  }
  return (
    <p className="wrap note">
      Preview. {FREE_LINE} Full desks open after you open the sign in link.{' '}
      <button className="pro-cta" type="button" onClick={openAccessDialog}>
        Request early access
      </button>
      {' · '}
      <Link href="/pro/sign-in">Sign in</Link>
    </p>
  )
}
