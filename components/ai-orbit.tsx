import type { AiOrbitNote } from '@/lib/ai-orbit'

export function AiOrbit({ notes }: { notes: AiOrbitNote[] }) {
  if (notes.length === 0) return null
  return (
    <section>
      {notes.map((note) => (
        <div key={note.id}>
          <p className="kicker">AI in orbit</p>
          <p className="when-kid">{note.kid}</p>
          <p className="when-adult">{note.adult}</p>
          <p className="meta">
            <a href={note.sourceUrl}>{note.sourceTitle}</a>
            {' · as of '}
            {note.asOf}
          </p>
        </div>
      ))}
    </section>
  )
}
