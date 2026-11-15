import { PrintButton } from '@/components/pro/print-button'
import type { ProBrief } from '@/lib/pro/brief'

export function BriefView({ brief, talk, source }: { brief: ProBrief; talk: string[]; source: 'template' | 'model' }) {
  return (
    <article className="pro-brief">
      <p className="kicker">One page brief</p>
      <h1>{brief.title}</h1>
      <p className="lede">Public records only. A missing figure stays blank instead of becoming a guess.</p>
      <PrintButton />
      {brief.facts.length === 0 ? <p>No sourced figure is on file yet.</p> : null}
      <dl className="pro-facts">
        {brief.facts.map((fact) => (
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
        {talk.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ol>
    </article>
  )
}
