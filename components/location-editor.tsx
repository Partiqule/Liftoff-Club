'use client'

import { useState, type FormEvent } from 'react'
import { placeFromBrowser, useClub } from '@/components/club-provider'
import { searchPlaces } from '@/lib/places'
import type { Place } from '@/lib/types'

export function LocationEditor({ heading = true }: { heading?: boolean }) {
  const { settings, setLocation } = useClub()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSearch(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const found = await searchPlaces(query)
      setResults(found)
      if (found.length === 0) setError('No town matched. Try a city name, like Centennial or Cocoa Beach.')
    } catch {
      setError('The place search did not answer. Try again in a moment.')
    } finally {
      setBusy(false)
    }
  }

  async function onDevice() {
    setBusy(true)
    setError(null)
    try {
      const place = await placeFromBrowser()
      setLocation(place)
      setResults([])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Location was not available.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div id="place">
      {heading ? <h2>Where you watch from</h2> : null}
      {settings.location ? (
        <p className="lede">
          Watching from <strong>{settings.location.label}</strong>. This stays in this browser. Nothing is sent to a Liftoff Club account, because there is not one.
        </p>
      ) : (
        <p className="lede">A city or ZIP is enough. It stays on this device and is used to check the sky.</p>
      )}
      <form onSubmit={onSearch}>
        <label className="sr-only" htmlFor="place-query">
          City or ZIP
        </label>
        <input
          id="place-query"
          className="field"
          value={query}
          placeholder="Centennial, or 80112"
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="form-row">
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Looking…' : 'Find this place'}
          </button>
          <button className="btn btn-quiet" type="button" onClick={() => void onDevice()} disabled={busy}>
            Use this device
          </button>
          {settings.location ? (
            <button className="btn btn-quiet" type="button" onClick={() => setLocation(null)}>
              Clear place
            </button>
          ) : null}
        </div>
      </form>
      {error ? <p className="error">{error}</p> : null}
      {results.length > 0 ? (
        <ul className="results">
          {results.map((place) => (
            <li key={`${place.label}-${place.lat}`}>
              <button
                type="button"
                onClick={() => {
                  setLocation(place)
                  setResults([])
                  setQuery('')
                }}
              >
                {place.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
