'use client'

import { useState, type FormEvent } from 'react'
import { accessMailto, accessNote, type AccessDesk } from '@/lib/pro/access'

export function AccessForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [organization, setOrganization] = useState('')
  const [desk, setDesk] = useState<AccessDesk>('company')
  const [note, setNote] = useState('')
  const [ready, setReady] = useState<string | null>(null)

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const input = { name, email, organization, desk, note }
    const text = accessNote(input)
    setReady(text)
    window.location.href = accessMailto(input)
  }

  return (
    <form className="pro-access" onSubmit={onSubmit}>
      <label>
        Name
        <input className="field" value={name} required onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        Work email
        <input className="field" type="email" value={email} required onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label>
        Organization
        <input className="field" value={organization} required onChange={(event) => setOrganization(event.target.value)} />
      </label>
      <label>
        Which desk
        <select className="pro-select" value={desk} onChange={(event) => setDesk(event.target.value as AccessDesk)}>
          <option value="company">Company desk</option>
          <option value="sales">Sales desk</option>
        </select>
      </label>
      <label>
        Note
        <input className="field" value={note} placeholder="What you want to watch" onChange={(event) => setNote(event.target.value)} />
      </label>
      <button className="btn" type="submit">
        Open in my mail app
      </button>
      {ready ? (
        <pre className="pro-note-preview">{ready}</pre>
      ) : null}
    </form>
  )
}
