import { googleCalendarUrl, outlookCalendarUrl } from '@/lib/calendar'
import type { Launch } from '@/lib/types'

export function CalendarLinks({ launch, baseUrl }: { launch: Launch; baseUrl: string }) {
  const google = googleCalendarUrl(launch, baseUrl)
  const outlook = outlookCalendarUrl(launch, baseUrl)
  return (
    <section>
      <p className="kicker">Put it on a calendar</p>
      <h2>So the slip still finds you</h2>
      <p className="lede">
        A single launch can be saved now. The subscribe feed, on the launches page, is the one that moves when a rocket slips.
        Calendar alarms do not know about bedtime quiet hours.
      </p>
      <div className="tickets">
        <a className="ticket" href={`/launches/${launch.id}/event.ics`}>
          Apple / .ics
        </a>
        <a className="ticket" href={google}>
          Google
        </a>
        <a className="ticket" href={outlook}>
          Outlook
        </a>
      </div>
    </section>
  )
}
