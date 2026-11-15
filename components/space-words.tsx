'use client'

import { useState } from 'react'
import { GLOSSARY_GROUPS, getTerm, termsInGroup } from '@/lib/glossary'
import { TermCard, openWord, useSpaceWords } from '@/components/glossary-text'

export function SpaceWords() {
  const saved = useSpaceWords()
  const [openId, setOpenId] = useState<string | null>(null)

  function choose(id: string) {
    openWord(id)
    setOpenId(id)
  }

  return (
    <>
      <section>
        <p className="kicker">On this device</p>
        <h2>My space words</h2>
        {saved.length === 0 ? (
          <p className="note">Tap a word on a launch, on the timeline, or on launch day. It stays here, and only in this browser.</p>
        ) : (
          <div className="word-list">
            {saved.map((id) => {
              const term = getTerm(id)
              if (!term) return null
              return (
                <button key={id} className="term" type="button" onClick={() => choose(id)}>
                  {term.term}
                </button>
              )
            })}
          </div>
        )}
      </section>
      {GLOSSARY_GROUPS.map((group) => (
        <section key={group.id}>
          <h2>{group.label}</h2>
          <ul className="jobs">
            {termsInGroup(group.id).map((term) => (
              <li key={term.id}>
                <h3>
                  <button className="term" type="button" onClick={() => choose(term.id)}>
                    {term.term}
                  </button>
                </h3>
                {term.expands ? <p className="meta">{term.expands}</p> : null}
                <p className="when-kid">{term.kid}</p>
                <p className="when-adult">{term.adult}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {openId ? <TermCard id={openId} onClose={() => setOpenId(null)} /> : null}
    </>
  )
}
