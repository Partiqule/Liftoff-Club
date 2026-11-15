import { PrintButton } from '@/components/pro/print-button'
import type { ProBrief } from '@/lib/pro/brief'

export function BriefView({
  brief,
  talk,
  source,
  preview = false,
}: {
  brief: ProBrief
  talk: string[]
  source: 'template' | 'model'
  preview?: boolean
}) {
  const facts = preview ? brief.facts.slice(0, 2) : brief.facts
  const lines = preview ? talk.slice(0, 1) : talk
  return (
    <article className="pro-brief">
      <p className="kicker">One page brief</p>
      <h1>{brief.title}</h1>
      <p className="lede">Each figure below is a public record. The link is the source, and the date is when that source was read.</p>
      {preview ? <p className="note">Sample brief. Free during early access. The rest opens after approval.</p> : null}
      <PrintButton />
      {brief.facts.length === 0 ? <p>No sourced figure is on file yet.</p> : null}
      <dl className="pro-facts">
        {facts.map((fact) => (
          <div key={`${fact.heading}-${fact.text}`}>
            <dt>{fact.heading}</dt>
            <dd>
              {fact.text}{' '}
              <a href={fact.sourceUrl}>
                {fact.sourceTitle}
              </a>
              {' · as of '}
              {fact.asOf}
            </dd>
          </div>
        ))}
      </dl>
      {brief.gaps.length > 0 ? (
        <>
          <h2>Not on file</h2>
          <ul>
            {brief.gaps.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
        </>
      ) : null}
      <h2>Talk track</h2>
      <p className="meta">{source === 'model' ? 'Rewritten from the sourced lines above. No new numbers were kept.' : 'Written from the sourced lines above. No model key is required.'}</p>
      <ol className="pro-talk">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ol>
    </article>
  )
}
