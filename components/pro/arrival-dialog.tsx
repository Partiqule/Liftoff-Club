'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { EXPIRED_COPY, SIGN_IN_READY, WELCOME_COPY, type AccessLevel } from '@/lib/pro/access-gate'
import { Modal } from '@/components/pro/modal'

export function ArrivalDialog({ level }: { level: AccessLevel }) {
  const params = useSearchParams()
  const flag = params.get('in')
  const expired = flag === 'expired' || (flag === '1' && level !== 'full')
  const welcome = flag === '1' && level === 'full'
  const [dismissed, setDismissed] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [note, setNote] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const show = (welcome || expired) && dismissed !== flag

  function close() {
    setDismissed(flag)
    const url = new URL(window.location.href)
    url.searchParams.delete('in')
    window.history.replaceState(null, '', `${url.pathname}${url.search}`)
  }

  async function sendFresh() {
    setPending(true)
    setNote(null)
    try {
      const response = await fetch('/api/pro/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const payload = (await response.json()) as { error?: string }
      setNote(response.ok ? SIGN_IN_READY : (payload.error ?? 'The note did not go through.'))
    } catch {
      setNote('The note did not go through.')
    } finally {
      setPending(false)
    }
  }

  if (!show) return null
  return (
    <Modal labelledBy="arrival-title" onClose={close}>
      {welcome ? (
        <>
          <h2 id="arrival-title">{WELCOME_COPY.title}</h2>
          <p>{WELCOME_COPY.body}</p>
          <button className="btn" type="button" onClick={close}>
            {WELCOME_COPY.close}
          </button>
        </>
      ) : (
        <>
          <h2 id="arrival-title">{EXPIRED_COPY.title}</h2>
          <p>{EXPIRED_COPY.body}</p>
          <label>
            Email
            <input className="field" type="email" value={email} autoComplete="email" onChange={(event) => setEmail(event.target.value)} />
          </label>
          <button className="btn" type="button" disabled={pending || !email} onClick={() => void sendFresh()}>
            {pending ? 'Sending' : EXPIRED_COPY.button}
          </button>
          {note ? <p className="meta">{note}</p> : null}
          <button className="btn" type="button" onClick={close}>
            Close
          </button>
        </>
      )}
    </Modal>
  )
}
