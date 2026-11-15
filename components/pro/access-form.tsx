'use client'

import { useState, type FormEvent } from 'react'
import { SIGN_IN_READY } from '@/lib/pro/access-gate'
import type { AccessDesk } from '@/lib/pro/signups'
import { track } from '@/lib/track'

export function AccessForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [desk, setDesk] = useState<AccessDesk>('company')
  const [website, setWebsite] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setMessage(null)
    try {
      const response = await fetch('/api/pro/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, company, role, desk, website }),
      })
      const payload = (await response.json()) as { ok?: boolean; error?: string; mailed?: boolean }
      if (!response.ok) {
        setMessage(payload.error ?? 'The note did not go through.')
        return
      }
      track('pro_signup_submitted')
      setMessage(payload.mailed === false ? 'Saved. The sign in link is sent when an admin opens the desk.' : SIGN_IN_READY)
      setName('')
      setEmail('')
      setCompany('')
      setRole('')
    } catch {
      setMessage('The note did not go through.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="pro-access" onSubmit={(event) => void onSubmit(event)}>
      <label>
        Name
        <input className="field" name="name" value={name} required autoComplete="name" onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        Work email
        <input className="field" name="email" type="email" value={email} required autoComplete="email" onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label>
        Company
        <input className="field" name="company" value={company} required autoComplete="organization" onChange={(event) => setCompany(event.target.value)} />
      </label>
      <label>
        Role
        <input className="field" name="role" value={role} required onChange={(event) => setRole(event.target.value)} />
      </label>
      <label>
        Which desk
        <select className="pro-select" name="desk" value={desk} onChange={(event) => setDesk(event.target.value as AccessDesk)}>
          <option value="company">Company desk</option>
          <option value="sales">Sales desk</option>
        </select>
      </label>
      <label className="pro-honey" aria-hidden="true">
        Website
        <input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
      </label>
      <button className="btn" type="submit" disabled={pending}>
        {pending ? 'Sending' : 'Request early access'}
      </button>
      <p className="note">Your name, work email, company, and role are saved with the sign up. They are not sold. Free during early access.</p>
      {message ? <p className="meta">{message}</p> : null}
    </form>
  )
}
