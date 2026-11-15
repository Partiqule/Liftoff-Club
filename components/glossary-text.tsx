'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useClub } from '@/components/club-provider'
import { getTerm, splitGlossary } from '@/lib/glossary'
import { WORDS_KEY, readWordIds, rememberWord } from '@/lib/words'

let current: string[] = []
let loaded = false
const listeners = new Set<() => void>()

function read(): string[] {
  if (!loaded && typeof window !== 'undefined') {
    current = readWordIds(window.localStorage.getItem(WORDS_KEY))
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
  if (typeof window !== 'undefined') window.localStorage.setItem(WORDS_KEY, JSON.stringify(next))
  listeners.forEach((listener) => listener())
}

export function useSpaceWords(): string[] {
  return useSyncExternalStore(subscribe, read, () => [] as string[])
}

export function openWord(id: string) {
  write(rememberWord(read(), id))
}

export function GlossaryText({ text }: { text: string }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const parts = splitGlossary(text)
  return (
    <>
      {parts.map((part, index) =>
        part.type === 'text' ? (
          <span key={index}>{part.value}</span>
        ) : (
          <button
            key={`${part.id}-${index}`}
            type="button"
            className="term"
            aria-haspopup="dialog"
            onClick={() => {
              openWord(part.id)
              setOpenId(part.id)
            }}
          >
            {part.value}
          </button>
        ),
      )}
      {openId ? <TermCard id={openId} onClose={() => setOpenId(null)} /> : null}
    </>
  )
}

export function TermCard({ id, onClose }: { id: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const { settings } = useClub()
  const term = getTerm(id)
  useEffect(() => {
    const node = ref.current
    if (!node || node.open) return
    node.showModal()
  }, [id])
  if (!term) return null
  const kids = settings.kidsMode
  return (
    <dialog
      ref={ref}
      className="term-card"
      aria-labelledby="term-card-title"
      onClose={onClose}
      onClick={(event) => {
        const node = ref.current
        if (!node) return
        const rect = node.getBoundingClientRect()
        const inside =
          event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom
        if (!inside) node.close()
      }}
    >
      <p className="kicker">{term.expands ?? 'Space word'}</p>
      <h2 id="term-card-title">{term.term}</h2>
      <p>{kids ? term.kid : term.adult}</p>
      <p className="meta">{kids ? term.adult : term.kid}</p>
      <button className="btn" type="button" onClick={() => ref.current?.close()}>
        Close
      </button>
    </dialog>
  )
}
