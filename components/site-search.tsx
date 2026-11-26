'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { SearchHit } from '@/lib/search'

export function SiteSearch() {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [open, setOpen] = useState(false)
  const [settled, setSettled] = useState('')
  const box = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if (event.key === '/' && !typing) {
        event.preventDefault()
        box.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) return
    const handle = window.setTimeout(() => {
      void fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
        .then((response) => response.json())
        .then((payload: { hits?: SearchHit[] }) => {
          setHits(payload.hits ?? [])
          setSettled(trimmed)
        })
        .catch(() => {
          setHits([])
          setSettled(trimmed)
        })
    }, 180)
    return () => window.clearTimeout(handle)
  }, [query])
  const trimmed = query.trim()
  const shown = trimmed.length < 2 ? [] : hits
  const empty = open && trimmed.length >= 2 && settled === trimmed && shown.length === 0

  return (
    <div className="site-search">
      <label className="sr-only" htmlFor="site-search">
        Search rockets, launches, pads, companies, and words
      </label>
      <input
        id="site-search"
        ref={box}
        className="field"
        value={query}
        placeholder="Search  /"
        autoComplete="off"
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
      />
      {open && shown.length > 0 ? (
        <ul className="search-hits">
          {shown.map((hit) => (
            <li key={`${hit.kind}-${hit.href}-${hit.title}`}>
              <Link href={hit.href} onClick={() => setOpen(false)}>
                <span className="kicker">{hit.kind}</span>
                {hit.title}
                <span className="meta">{hit.detail}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : empty ? (
        <p className="search-empty" role="status">
          Nothing matched.
        </p>
      ) : null}
    </div>
  )
}
