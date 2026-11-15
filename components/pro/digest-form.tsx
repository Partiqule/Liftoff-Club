'use client'

import { useState, type FormEvent } from 'react'
import { FREE_LINE } from '@/lib/pro/access-gate'

export function DigestForm() {
  const [email, setEmail] = useState('')
  const [note, setNote] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setNote(null)
    try {
      const response = await fetch('/api/pro/digest/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const payload = (await response.json()) as { error?: string }
      setNote(response.ok ? 'Check your email to confirm the Monday note.' : (payload.error ?? 'The note did not go through.'))
      if (response.ok) setEmail('')
    } catch {
      setNote('The note did not go through.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="pro-access" onSubmit={(event) => void onSubmit(event)}>
      <p>{FREE_LINE} A confirm link comes first. The Monday note starts only after you open it.</p>
      <label>
        Email
        <input className="field" type="email" value={email} required autoComplete="email" onChange={(event) => setEmail(event.target.value)} />
      </label>
      <button className="btn" type="submit" disabled={pending}>
        {pending ? 'Sending' : 'Join the Monday note'}
      </button>
      {note ? <p className="meta">{note}</p> : null}
    </form>
  )
}
