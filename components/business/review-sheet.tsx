import Link from 'next/link'
import { PrintButton } from '@/components/pro/print-button'
import type { ReviewModel } from '@/lib/business/review'

export function ReviewSheet({ review }: { review: ReviewModel }) {
  return (
    <article className="review-sheet pro-brief">
      <p className="kicker">{review.illustrative ? 'Example' : 'Quarterly launch review'}</p>
      <h2>
        {review.title}
        <span className="meta"> {review.quarterLabel}</span>
      </h2>
      {review.illustrative ? <p className="note">Example layout. These lines are not a customer record.</p> : null}
      <section>
        <h3>Flights in the quarter</h3>
        {review.flown.length === 0 ? <p>No successful flight in this quarter is on the public list.</p> : null}
        <ul>
          {review.flown.map((item) => (
            <li key={item.id}>
              <Link href={item.href}>{item.name}</Link>
              <span className="meta"> {item.when}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3>Payloads</h3>
        <p>{review.payloadLine}</p>
        {review.payloadNames.length > 0 ? (
          <ul>
            {review.payloadNames.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        ) : null}
      </section>
      <section>
        <h3>Slips</h3>
        {review.slips.length === 0 ? <p>No scrub or slip in this quarter has a public status.</p> : null}
        <ul>
          {review.slips.map((item) => (
            <li key={item.id}>{item.text}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3>What is next</h3>
        {review.next.length === 0 ? <p>Nothing ahead is on the current board for this cut.</p> : null}
        <ul>
          {review.next.map((item) => (
            <li key={item.id}>
              <Link href={item.href}>{item.name}</Link>
              <span className="meta"> {item.when}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3>Deployment</h3>
        {review.deployment.length === 0 ? <p>No public in orbit figure is tied to this company.</p> : null}
        {review.deployment.map((group) => (
          <div key={group.name}>
            <p>{group.name}</p>
            <ul>
              {group.lines.map((line) => (
                <li key={line.text}>
                  {line.text}{' '}
                  <a href={line.sourceUrl}>{line.sourceTitle}</a>
                  {' · as of '}
                  {line.asOf}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
      {review.gaps.length > 0 ? (
        <section>
          <h3>Gaps</h3>
          <ul>
            {review.gaps.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
        </section>
      ) : null}
      <footer>
        <h3>Sources</h3>
        <ul>
          {review.sources.map((source) => (
            <li key={`${source.sourceUrl}-${source.text}`}>
              <a href={source.sourceUrl}>{source.sourceTitle}</a>
              {' · as of '}
              {source.asOf}. {source.text}
            </li>
          ))}
        </ul>
        <p>{review.affiliation}</p>
      </footer>
      <p className="review-controls">
        <PrintButton />
      </p>
    </article>
  )
}
