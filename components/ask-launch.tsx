'use client'

import { useState, type FormEvent } from 'react'

export function AskLaunch({ launchId }: { launchId: string }) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [source, setSource] = useState<'listing' | 'model' | null>(null)
  const [busy, setBusy] = useState(false)

  async function onAsk(event: FormEvent) {
    event.preventDefault()
    const trimmed = question.trim()
    if (!trimmed) return
    setBusy(true)
    try {
      const response = await fetch(`/api/launches/${launchId}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed }),
      })
      const body = (await response.json()) as { answer?: string; source?: 'listing' | 'model' }
      setAnswer(body.answer ?? 'No answer came back.')
      setSource(body.source ?? 'listing')
    } catch {
      setAnswer('The question did not go through. The listing is still on this page.')
      setSource('listing')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="when-adult">
      <p className="kicker">Ask about this launch</p>
      <h2>Only what the listing says</h2>
      <p className="lede">
        Questions stay with this launch. If a model key is configured on the server, the answer is cached. Without a key, the reply is taken straight from the record.
      </p>
      <form onSubmit={(event) => void onAsk(event)}>
        <label className="sr-only" htmlFor="ask-launch">
          Question
        </label>
        <input
          id="ask-launch"
          className="field"
          value={question}
          placeholder="Which booster, and where does it land?"
          onChange={(event) => setQuestion(event.target.value)}
        />
        <div className="form-row">
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Looking…' : 'Ask'}
          </button>
        </div>
      </form>
      {answer ? (
        <p>
          {answer}{' '}
          <span className="meta">{source === 'model' ? 'From the model, cached.' : 'From the listing.'}</span>
        </p>
      ) : null}
    </section>
  )
}
