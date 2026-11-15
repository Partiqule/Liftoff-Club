import Link from 'next/link'
import { FREE_LINE, type AccessLevel } from '@/lib/pro/access-gate'

export function PreviewBanner({ level, email }: { level: AccessLevel; email: string | null }) {
  if (level === 'full') {
    return (
      <p className="wrap meta">
        Signed in{email ? ` as ${email}` : ''}. {FREE_LINE}
        <form action="/api/pro/sign-out" method="post" style={{ display: 'inline' }}>
          {' '}
          <button className="btn" type="submit">
            Sign out
          </button>
        </form>
      </p>
    )
  }
  return (
    <p className="wrap note">
      Preview. {FREE_LINE} Full desks open after approval.{' '}
      <Link href="/pro#access">Request early access</Link>
      {' · '}
      <Link href="/pro/sign-in">Sign in</Link>
    </p>
  )
}
