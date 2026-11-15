'use client'

import { useState } from 'react'
import { FREE_LINE } from '@/lib/pro/access-gate'

export type AdminRow = {
  email: string
  name: string
  company: string
  role: string
  createdAt: string
  status: string
  tier: string
  companySize: string | null
}

export function AdminDesk({ rows }: { rows: AdminRow[] }) {
  const [token, setToken] = useState('')
  const [note, setNote] = useState<string | null>(null)

  async function post(body: Record<string, string>) {
    setNote(null)
    const response = await fetch('/api/pro/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const payload = (await response.json()) as { error?: string }
    if (!response.ok) {
      setNote(payload.error ?? 'That did not go through.')
      return
    }
    window.location.reload()
  }

  return (
    <div>
      <form
        className="pro-access"
        onSubmit={(event) => {
          event.preventDefault()
          void post({ action: 'login', token })
        }}
      >
        <label>
          Admin token
          <input className="field" type="password" value={token} autoComplete="off" onChange={(event) => setToken(event.target.value)} />
        </label>
        <button className="btn" type="submit">
          Unlock admin
        </button>
      </form>
      {note ? <p className="note">{note}</p> : null}
      <p className="meta">{FREE_LINE} Approving sends a sign in link.</p>
      <ul className="jobs">
        {rows.map((row) => (
          <li key={`${row.email}-${row.createdAt}`}>
            <h3>{row.name}</h3>
            <p className="meta">
              {row.tier} · {row.email} · {row.company} · {row.role}
              {row.companySize ? ` · ${row.companySize}` : ''} · {row.status}
            </p>
            <p>
              <button className="btn" type="button" onClick={() => void post({ action: 'approve', email: row.email })}>
                Approve
              </button>{' '}
              <button className="btn" type="button" onClick={() => void post({ action: 'revoke', email: row.email })}>
                Revoke
              </button>
            </p>
          </li>
        ))}
      </ul>
      {rows.length === 0 ? <p className="note">No early access notes are stored yet.</p> : null}
    </div>
  )
}
