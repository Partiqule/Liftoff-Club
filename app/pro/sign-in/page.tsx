import type { Metadata } from 'next'
import { SignInForm } from '@/components/pro/sign-in-form'
import { FREE_LINE } from '@/lib/pro/access-gate'

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Passwordless sign in for Liftoff Club Pro.',
}

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams
  return (
    <main id="content" className="wrap page">
      <p className="kicker">Pro</p>
      <h1>Sign in</h1>
      <p className="lede">{FREE_LINE} The family site stays account free.</p>
      <SignInForm error={query.error} />
    </main>
  )
}
