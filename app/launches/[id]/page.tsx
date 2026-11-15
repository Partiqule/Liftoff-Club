import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AiOrbit } from '@/components/ai-orbit'
import { AskLaunch } from '@/components/ask-launch'
import { GlossaryText } from '@/components/glossary-text'
import { CalendarLinks } from '@/components/calendar-links'
import { Countdown } from '@/components/countdown'
import { JobsCorner } from '@/components/jobs'
import { LocalTime } from '@/components/local-time'
import { Patch } from '@/components/patch'
import { StatusStamp } from '@/components/status-stamp'
import { VisibilityCard } from '@/components/visibility-card'
import { aiNotesForLaunch } from '@/lib/ai-orbit'
import { explainLaunch } from '@/lib/explain'
import { getLaunch, getLaunches } from '@/lib/launches'
import { siteUrl } from '@/lib/site'

export const revalidate = 3600

export async function generateStaticParams() {
  const board = await getLaunches()
  return board.launches.map((launch) => ({ id: launch.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const launch = await getLaunch(id)
  if (!launch) return { title: 'Launch' }
  return {
    title: launch.name,
    description: launch.missionDescription?.slice(0, 180) ?? `${launch.provider.name} · ${launch.rocketName}`,
  }
}

export default async function LaunchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const launch = await getLaunch(id)
  if (!launch) notFound()
  const story = await explainLaunch(launch)
  const aiNotes = aiNotesForLaunch(launch)
  const loose = /day|month|year|quarter|week/i.test(launch.precision ?? '')
  return (
    <main id="content" className="wrap page">
      <p className="kicker">
        {launch.provider.name} · {launch.padLocation ?? launch.padName}
      </p>
      <div className="detail-top">
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
          <Patch provider={launch.provider.name} rocket={launch.rocketName} />
          <StatusStamp abbrev={launch.statusAbbrev} name={launch.statusName} />
        </div>
        <h1>{launch.name}</h1>
        <AiOrbit notes={aiNotes} />
        <Countdown net={launch.net} size="lg" />
        <p className="day-link">
          <Link className="btn" href={`/launches/${launch.id}/day`}>
            Launch day mode
          </Link>
        </p>
        <p className="meta">
          <LocalTime iso={launch.net} />
          {launch.windowEnd ? (
            <>
              {' '}
              · window to <LocalTime iso={launch.windowEnd} />
            </>
          ) : null}
          {loose ? ' · the clock can still move' : null}
        </p>
      </div>
      <div className="detail-grid">
        <article>
          <p className="kicker">What this is</p>
          <p className="story when-kid">
            <GlossaryText text={story.kid} />
          </p>
          <p className="story when-adult">
            <GlossaryText text={story.adult} />
          </p>
          <p className="meta">
            {story.source === 'model'
              ? 'Story drafted by a model from the public listing and cached on the server.'
              : 'Story written from the public listing. A model key can be added later; none is required.'}
          </p>
          <VisibilityCard launch={launch} />
        </article>
        <aside>
          <p className="kicker">Flight plate</p>
          <dl className="plate">
            <dt>Rocket</dt>
            <dd>{launch.rocketName}</dd>
            <dt>Pad</dt>
            <dd>{launch.padName}</dd>
            <dt>Orbit</dt>
            <dd>{launch.orbitName ? <GlossaryText text={launch.orbitName} /> : 'Not listed'}</dd>
            <dt>Status</dt>
            <dd>
              <GlossaryText text={launch.statusName} />
            </dd>
            {launch.boosterSerial ? (
              <>
                <dt>Booster</dt>
                <dd>
                  {launch.boosterSerial}
                  {launch.boosterFlights ? ` · flight ${launch.boosterFlights}` : ''}
                </dd>
              </>
            ) : null}
            {launch.landingLocation ? (
              <>
                <dt>Landing</dt>
                <dd>{launch.landingLocation}</dd>
              </>
            ) : null}
            {launch.probability != null ? (
              <>
                <dt>Odds</dt>
                <dd>{launch.probability}% listed</dd>
              </>
            ) : null}
          </dl>
          {launch.weatherConcerns ? (
            <p className="note">
              <GlossaryText text={launch.weatherConcerns} />
            </p>
          ) : null}
          {launch.landingDescription ? (
            <p className="note">
              <GlossaryText text={launch.landingDescription} />
            </p>
          ) : null}
          <div className="when-adult">
            <p className="kicker">The record</p>
            <dl className="plate">
              <dt>Destination</dt>
              <dd>{launch.spacecraftDestination ? <GlossaryText text={launch.spacecraftDestination} /> : 'Not listed'}</dd>
              <dt>Customers</dt>
              <dd>
                {launch.manifest.filter((item) => item.role !== 'provider').map((item) => item.company).filter((name, index, all) => all.indexOf(name) === index).join(', ') ||
                  'Not named'}
              </dd>
              {launch.boosterSerial ? (
                <>
                  <dt>History</dt>
                  <dd>
                    {[
                      launch.boosterReused === true ? 'Flown before' : launch.boosterReused === false ? 'First flight' : null,
                      launch.boosterCareerFlights ? `${launch.boosterCareerFlights} flights` : null,
                      launch.boosterSuccessfulLandings != null ? `${launch.boosterSuccessfulLandings} landings` : null,
                      launch.previousFlightName ? `Last: ${launch.previousFlightName}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'No extra history'}
                  </dd>
                </>
              ) : null}
            </dl>
            {launch.webcasts?.length ? (
              <div className="tickets">
                {launch.webcasts.map((video) => (
                  <a key={video.url} className="ticket" href={video.url}>
                    {video.title}
                  </a>
                ))}
              </div>
            ) : null}
            <h2>Clock changes</h2>
            {(launch.updates ?? []).length === 0 ? <p className="note">No public note of a scrub or delay.</p> : null}
            <ul className="jobs">
              {(launch.updates ?? []).map((update) => (
                <li key={`${update.at ?? 'note'}-${update.text.slice(0, 24)}`}>
                  <p>
                    <GlossaryText text={update.text} />
                  </p>
                  {update.at ? (
                    <p className="meta">
                      <LocalTime iso={update.at} />
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
          <div className="tickets" style={{ marginTop: '1rem' }}>
            {launch.webcastUrl ? (
              <a className="ticket" href={launch.webcastUrl}>
                Broadcast
              </a>
            ) : null}
            {launch.infoUrl ? (
              <a className="ticket" href={launch.infoUrl}>
                Official page
              </a>
            ) : null}
          </div>
        </aside>
      </div>
      {launch.timeline.length > 0 ? (
        <section>
          <p className="kicker">Timeline</p>
          <h2>Calls on the clock</h2>
          <ol className="jobs">
            {launch.timeline.map((event) => (
              <li key={`${event.abbrev}-${event.offsetSec}`}>
                <h3>
                  <GlossaryText text={event.abbrev} />
                </h3>
                <p>
                  <GlossaryText text={event.description} />
                </p>
              </li>
            ))}
          </ol>
          <p className="note">
            <Link href="/glossary">All the space words</Link>
          </p>
        </section>
      ) : null}
      <JobsCorner launch={launch} />
      <AskLaunch launchId={launch.id} />
      <CalendarLinks launch={launch} baseUrl={siteUrl()} />
    </main>
  )
}
