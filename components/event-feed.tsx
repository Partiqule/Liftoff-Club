import { EventWhen } from '@/components/event-when'
import type { PublicEvent } from '@/lib/events'

export function EventFeed({
  events,
  refreshedAt,
  notice,
}: {
  events: PublicEvent[]
  refreshedAt: string | null
  notice: string | null
}) {
  const refreshed = refreshedAt ? `${refreshedAt.slice(0, 16).replace('T', ' ')} UTC` : 'not recorded'
  return (
    <section>
      <p className="kicker">Tests and events</p>
      <h2>Tests and events</h2>
      <p className="meta">
        Source: <a href="https://ll.thespacedevs.com/2.3.0/events/">Launch Library 2 events</a>. Last refresh {refreshed}.
      </p>
      {notice ? <p className="note">{notice}</p> : null}
      {events.length === 0 ? <p className="note">No public test or event is on the list right now.</p> : null}
      <ul className="jobs">
        {events.map((event) => (
          <li key={event.id} id={event.id}>
            <p className="kicker">{event.type}</p>
            <h3>{event.name}</h3>
            <p className="meta">
              <EventWhen iso={event.when} precision={event.precision} />
              {event.location ? ` · ${event.location}` : ''}
            </p>
            <p className="when-kid">{event.kid}</p>
            <p className="when-adult">{event.description ?? 'No public description on this listing.'}</p>
            <p className="meta">
              <a href={event.sourceUrl}>Launch Library 2</a>
              {event.infoUrl ? (
                <>
                  {' · '}
                  <a href={event.infoUrl}>{event.infoTitle ?? 'Public page'}</a>
                </>
              ) : null}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
