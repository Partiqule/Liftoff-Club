'use client'

import { useState, type FormEvent } from 'react'
import { placeFromBrowser, useClub } from '@/components/club-provider'
import { ZonePicker } from '@/components/zone-picker'
import { searchPlaces } from '@/lib/places'
import type { Place } from '@/lib/types'

export function LocationEditor({ heading = true }: { heading?: boolean }) {
  const { settings, setLocation } = useClub()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [latText, setLatText] = useState('')
  const [lonText, setLonText] = useState('')

  async function onSearch(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const found = await searchPlaces(query)
      setResults(found)
      if (found.length === 0) setError('No town matched. Try a city name.')
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
          placeholder="City or ZIP"
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="form-row">
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Looking…' : 'Find this place'}
          </button>
          <button className="btn btn-quiet" type="button" onClick={() => void onDevice()} disabled={busy}>
            {busy ? 'Finding you…' : 'Use this phone\'s location'}
          </button>
        </div>
      </form>
      {error ? <p className="error">{error}</p> : null}
      <form
        onSubmit={(event) => {
          event.preventDefault()
          const lat = Number(latText)
          const lon = Number(lonText)
          if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
            setError('Latitude must be between -90 and 90, and longitude between -180 and 180.')
            return
          }
          setLocation({
            label: `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
            lat,
            lon,
            timezone: settings.location?.timezone || 'UTC',
            source: 'search',
          })
          setError(null)
        }}
      >
        <p className="kicker">Or enter coordinates</p>
        <div className="form-row">
          <label>
            Latitude
            <input className="field" inputMode="decimal" value={latText} onChange={(event) => setLatText(event.target.value)} />
          </label>
          <label>
            Longitude
            <input className="field" inputMode="decimal" value={lonText} onChange={(event) => setLonText(event.target.value)} />
          </label>
          <button className="btn btn-quiet" type="submit">
            Use these coordinates
          </button>
        </div>
      </form>
      <ZonePicker />
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
