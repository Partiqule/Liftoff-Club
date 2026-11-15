'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import { LocalTime } from '@/components/local-time'
import { FOLLOWS_KEY, toggleFollow } from '@/lib/follows'

export type FollowRosterItem = {
  slug: string
  name: string
  launchId: string | null
  launchName: string | null
  net: string | null
}

let current: string[] = []
let loaded = false
const listeners = new Set<() => void>()

function read(): string[] {
  if (!loaded && typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(FOLLOWS_KEY)
      const parsed = raw ? (JSON.parse(raw) as unknown) : []
      current = Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []
    } catch {
      current = []
    }
    loaded = true
  }
  return current
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function write(next: string[]) {
  current = next
  loaded = true
  if (typeof window !== 'undefined') window.localStorage.setItem(FOLLOWS_KEY, JSON.stringify(next))
  listeners.forEach((listener) => listener())
}

export function FollowList({
  slug,
  roster,
  buttonOnly = false,
  listOnly = false,
}: {
  slug: string
  roster: FollowRosterItem[]
  buttonOnly?: boolean
  listOnly?: boolean
}) {
  const follows = useSyncExternalStore(subscribe, read, () => [] as string[])
  const on = follows.includes(slug)
  const rows = roster.filter((item) => follows.includes(item.slug))
  const button = (
    <button className="btn" type="button" aria-pressed={on} onClick={() => write(toggleFollow(follows, slug))}>
      {on ? 'Following' : 'Follow this company'}
    </button>
  )
  if (buttonOnly) return button
  return (
    <section>
      {listOnly ? null : button}
      <p className="kicker">Who you follow</p>
      <h2>Who is flying what</h2>
      {rows.length === 0 ? <p className="note">Follow a company and its next flight shows up here, on this device only.</p> : null}
      <ul className="jobs">
        {rows.map((item) => (
          <li key={`${item.slug}-${item.launchId ?? 'none'}`}>
            <h3>
              <Link href={`/companies/${item.slug}`}>{item.name}</Link>
            </h3>
            {item.launchId && item.launchName ? (
              <p className="meta">
                <Link href={`/launches/${item.launchId}`}>{item.launchName}</Link>
                {item.net ? (
                  <>
                    {' · '}
                    <LocalTime iso={item.net} />
                  </>
                ) : null}
              </p>
            ) : (
              <p className="note">Nothing on the current board.</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
