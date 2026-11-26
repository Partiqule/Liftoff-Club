'use client'

import Link from 'next/link'
import { useState } from 'react'
import { placeFromBrowser, useClub } from '@/components/club-provider'

export function LocationPrompt() {
  const { setLocation } = useClub()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onDevice() {
    setBusy(true)
    setError(null)
    try {
      setLocation(await placeFromBrowser())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Location was not available.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="location-prompt">
      <p className="lede">No town is chosen yet. Sky times stay general until you pick a place.</p>
      <div className="hero-actions">
        <button className="btn" type="button" onClick={() => void onDevice()} disabled={busy}>
          {busy ? 'Finding you…' : "Use this phone's location"}
        </button>
        <Link className="btn btn-quiet" href="/settings#place">
          Search for a town
        </Link>
      </div>
      {error ? <p className="error">{error}</p> : null}
    </div>
  )
}
