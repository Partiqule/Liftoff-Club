'use client'

import { useState, type FormEvent } from 'react'
import { FREE_LINE } from '@/lib/pro/access-gate'

export function SignInForm({ error }: { error?: string }) {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setMessage(null)
    try {
      const response = await fetch('/api/pro/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const payload = (await response.json()) as { error?: string }
      setMessage(response.ok ? 'Check that inbox for a sign in link.' : (payload.error ?? 'The note did not go through.'))
    } catch {
      setMessage('The note did not go through.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="pro-access" onSubmit={(event) => void onSubmit(event)}>
      <p>{FREE_LINE} No password. A link comes to your email.</p>
      {error === 'link' ? <p className="note">That sign in link is used or expired.</p> : null}
      {error === 'store' ? <p className="note">The sign in store did not answer.</p> : null}
      <label>
        Work email
        <input className="field" type="email" value={email} required autoComplete="email" onChange={(event) => setEmail(event.target.value)} />
      </label>
      <button className="btn" type="submit" disabled={pending}>
        {pending ? 'Sending' : 'Email me a sign in link'}
      </button>
      {message ? <p className="meta">{message}</p> : null}
    </form>
  )
}
